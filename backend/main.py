import os
import json
import warnings
import asyncio
from datetime import datetime
warnings.filterwarnings("ignore", category=FutureWarning)
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
import html
import re
from groq import Groq
from dotenv import load_dotenv

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from redis import asyncio as aioredis
from celery.result import AsyncResult

# Database imports
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, select, delete, text
from pgvector.sqlalchemy import Vector

# Load environment variables
load_dotenv(dotenv_path="../frontend/.env.local")

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/meetings")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String) # Plain text for prototype/mock

class SessionModel(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional for now
    project = Column(String, default="Untitled Project")
    created_at = Column(DateTime, default=datetime.utcnow)
    insights_json = Column(Text) # Stores decisions and actionItems

class TranscriptModel(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    filename = Column(String)
    content = Column(Text)
    summary_json = Column(Text)
    sentiment_json = Column(Text)
    embedding = Column(Vector(1536)) # Added for Vector DB RAG

async def init_db():
    async with engine.begin() as conn:
        # Enable pgvector extension before creating tables
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Security Setup
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-please-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(UserModel).where(UserModel.username == username))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SmartMinutes AI Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup():
    await init_db()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis = aioredis.from_url(redis_url)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Groq
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("Warning: GROQ_API_KEY not found in environment")

client = Groq(api_key=api_key) if api_key else None

# Import Celery app and tasks (assuming worker.py is in same directory)
from worker import celery_app, extract_summary_task, get_sentiment_task, query_transcript_task, extract_insights_task

class TranscriptFile(BaseModel):
    filename: str = Field(..., max_length=255)
    text: str = Field(..., max_length=1000000)
    summary: Optional[Dict] = None
    sentiment: Optional[Dict] = None

    @field_validator('filename', mode='before')
    def sanitize_filename(cls, v):
        return html.escape(str(v)) if v else v

class ExtractRequest(BaseModel):
    transcripts: List[TranscriptFile] = Field(..., max_length=20)
    project: Optional[str] = Field("Untitled Project", max_length=100)
    user_id: Optional[int] = None

    @field_validator('project', mode='before')
    def sanitize_project(cls, v):
        return html.escape(str(v)) if v else v

class QueryRequest(BaseModel):
    question: str = Field(..., max_length=1000)
    transcripts: List[TranscriptFile] = Field(..., max_length=20)

    @field_validator('question', mode='before')
    def sanitize_question(cls, v):
        return html.escape(str(v)) if v else v

class TranscriptTextRequest(BaseModel):
    text: str = Field(..., max_length=1000000)
    filename: str = Field(..., max_length=255)

class UserAuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=128)

@app.get("/")
@limiter.limit("100/minute")
async def root(request: Request):
    return {"status": "online", "message": "SmartMinutes Python Backend is running on Groq"}

# ── Auth Endpoints ──────────────────────────────
@app.post("/auth/signup")
@limiter.limit("5/minute")
async def signup(request: Request, auth_req: UserAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Check if user already exists
        result = await db.execute(select(UserModel).where(UserModel.username == auth_req.username))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="User already exists")
        
        hashed_password = get_password_hash(auth_req.password)
        new_user = UserModel(username=auth_req.username, password_hash=hashed_password)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user.username}, expires_delta=access_token_expires
        )
        return {"id": new_user.id, "username": new_user.username, "access_token": access_token, "token_type": "bearer", "status": "success"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, auth_req: UserAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(UserModel).where(
            UserModel.username == auth_req.username
        ))
        user = result.scalars().first()
        if not user or not verify_password(auth_req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"id": user.id, "username": user.username, "access_token": access_token, "token_type": "bearer", "status": "success"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

def generate_groq_content(prompt: str) -> str:
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0,
    )
    return chat_completion.choices[0].message.content

@app.post("/summary")
@limiter.limit("20/minute")
async def extract_summary(request: Request, req_body: TranscriptTextRequest):
    try:
        task = extract_summary_task.delay(req_body.text, req_body.filename)
        return {"task_id": task.id, "status": "processing"}
    except Exception as e:
        print(f"Summary Error: {e}")
        return {"error": "Failed to queue summary task"}

@app.post("/sentiment")
@limiter.limit("20/minute")
async def get_sentiment(request: Request, req_body: TranscriptTextRequest):
    try:
        task = get_sentiment_task.delay(req_body.text)
        return {"task_id": task.id, "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract")
@limiter.limit("20/minute")
async def extract_insights(request: Request, req_body: ExtractRequest, db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    try:
        if not req_body.transcripts:
            return {"decisions": [], "actionItems": []}
            
        combined_text = "\n\n".join([f"--- {t.filename} ---\n{t.text}" for t in req_body.transcripts])
        
        # Queue the Celery task
        task = extract_insights_task.delay(combined_text)

        # Persistence logic (save placeholders, worker or frontend will update later)
        project = req_body.project or "Untitled Project"
        
        # Save Session
        new_session = SessionModel(
            project=project,
            user_id=current_user.id,
            created_at=datetime.utcnow(),
            insights_json="{}" # Empty initially until task completes
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        # Save Transcripts
        for t in req_body.transcripts:
            new_transcript = TranscriptModel(
                session_id=new_session.id,
                filename=t.filename,
                content=t.text,
                summary_json=json.dumps(t.summary) if t.summary else None,
                sentiment_json=json.dumps(t.sentiment) if t.sentiment else None
            )
            db.add(new_transcript)
        
        await db.commit()
        
        return {"task_id": task.id, "session_id": new_session.id, "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}")
@limiter.limit("60/minute")
async def get_task_status(request: Request, task_id: str):
    try:
        task_result = AsyncResult(task_id, app=celery_app)
        if task_result.state == 'PENDING':
            return {"status": "processing"}
        elif task_result.state == 'SUCCESS':
            return {"status": "completed", "result": task_result.result}
        else:
            return {"status": "failed", "error": str(task_result.info)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
@limiter.limit("50/minute")
@cache(expire=60) # Cache for 60 seconds using Redis
async def get_history(request: Request, user_id: Optional[int] = None, db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    stmt = select(SessionModel).where(SessionModel.user_id == current_user.id).order_by(SessionModel.created_at.desc())
    
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    
    output = []
    for s in sessions:
        # Get transcript filenames for this session
        t_result = await db.execute(select(TranscriptModel).where(TranscriptModel.session_id == s.id))
        transcripts = t_result.scalars().all()
        
        output.append({
            "id": s.id,
            "project": s.project,
            "uploadedAt": s.created_at.isoformat(),
            "files": [{"filename": t.filename} for t in transcripts],
            "insights": json.loads(s.insights_json)
        })
    return output

@app.get("/history/{session_id}")
@limiter.limit("50/minute")
async def get_session_detail(request: Request, session_id: int, db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    # Fetch session
    result = await db.execute(select(SessionModel).where(SessionModel.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
        
    # Fetch transcripts
    t_result = await db.execute(select(TranscriptModel).where(TranscriptModel.session_id == session_id))
    transcripts = t_result.scalars().all()
    
    return {
        "id": session.id,
        "project": session.project,
        "uploadedAt": session.created_at.isoformat(),
        "insights": json.loads(session.insights_json),
        "files": [
            {
                "filename": t.filename,
                "text": t.content,
                "summary": json.loads(t.summary_json) if t.summary_json else None,
                "sentiment": json.loads(t.sentiment_json) if t.sentiment_json else None
            } for t in transcripts
        ]
    }

@app.delete("/history/{session_id}")
@limiter.limit("20/minute")
async def delete_session(request: Request, session_id: int, db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    result = await db.execute(select(SessionModel).where(SessionModel.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")

    await db.execute(delete(TranscriptModel).where(TranscriptModel.session_id == session_id))
    await db.execute(delete(SessionModel).where(SessionModel.id == session_id))
    await db.commit()
    return {"status": "deleted"}

@app.post("/query")
@limiter.limit("20/minute")
async def query_transcript(request: Request, req_body: QueryRequest, current_user: UserModel = Depends(get_current_user)):
    try:
        combined_text = "\n\n".join([f"--- Meeting: {t.filename} ---\n{t.text}" for t in req_body.transcripts])
        task = query_transcript_task.delay(combined_text, req_body.question)
        return {"task_id": task.id, "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
