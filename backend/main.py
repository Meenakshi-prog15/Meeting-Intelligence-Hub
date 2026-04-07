import os
import json
import warnings
import asyncio
from datetime import datetime
warnings.filterwarnings("ignore", category=FutureWarning)
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from groq import Groq
from dotenv import load_dotenv

# Database imports
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, select, delete

# Load environment variables
load_dotenv(dotenv_path="../frontend/.env.local")

# Database Setup
DATABASE_URL = "sqlite+aiosqlite:///./meetings.db"
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

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Manual migration for existing databases
        def add_user_id_column(connection):
            try:
                connection.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER;")
            except Exception:
                pass # Column already exists
        
        await conn.run_sync(add_user_id_column)

app = FastAPI(title="SmartMinutes AI Backend")

@app.on_event("startup")
async def startup():
    await init_db()

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

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

class TranscriptFile(BaseModel):
    filename: str
    text: str
    summary: Optional[Dict] = None
    sentiment: Optional[Dict] = None

class ExtractRequest(BaseModel):
    transcripts: List[TranscriptFile]
    project: Optional[str] = "Untitled Project"
    user_id: Optional[int] = None

class QueryRequest(BaseModel):
    question: str
    transcripts: List[TranscriptFile]

class TranscriptTextRequest(BaseModel):
    text: str
    filename: str

class UserAuthRequest(BaseModel):
    username: str
    password: str

@app.get("/")
async def root():
    return {"status": "online", "message": "SmartMinutes Python Backend is running on Groq"}

# ── Auth Endpoints ──────────────────────────────
@app.post("/auth/signup")
async def signup(request: UserAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Check if user already exists
        result = await db.execute(select(UserModel).where(UserModel.username == request.username))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="User already exists")
        
        new_user = UserModel(username=request.username, password_hash=request.password)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return {"id": new_user.id, "username": new_user.username, "status": "success"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def login(request: UserAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(UserModel).where(
            UserModel.username == request.username,
            UserModel.password_hash == request.password
        ))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {"id": user.id, "username": user.username, "status": "success"}
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
async def extract_summary(request: TranscriptTextRequest):
    try:
        # Calculate word count in Python for reliability
        word_count = len(request.text.split())
        
        prompt = f"""
        Analyze this meeting transcript strictly to extract metadata.
        Return ONLY a JSON object with these keys:
        - "detected_date": (string, e.g. "2024-03-27" or "Unknown")
        - "speakers": (list of strings, e.g. ["Alex", "Priya"])
        - "summary": (brief 2-sentence summary)
        
        Transcript filename: {request.filename}
        Transcript: 
        \"\"\"
        {request.text[:4000]} 
        \"\"\"
        """
        
        response_text = generate_groq_content(prompt)
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        
        # Ensure we always have the word count from Python
        data["word_count"] = word_count
        return data
        
    except Exception as e:
        print(f"Summary Error: {e}")
        # Graceful fallback so the dashboard doesn't break
        return {
            "summary": "Summary generation failed.",
            "word_count": len(request.text.split()),
            "speakers": [],
            "detected_date": "Unknown"
        }

@app.post("/sentiment")
async def get_sentiment(request: TranscriptTextRequest):
    try:
        prompt = f"""
        Analyze this meeting transcript for speaker tone and sentiment.
        Identify the general "vibe" across the meeting timeline, and summarize the overall sentiment of each speaker.
        
        Format strictly as JSON:
        {{
            "segments": [
                {{ "time": "Beginning/Middle/End", "vibe": "Agreement/Conflict/Neutral", "sentimentScore": 0.8, "textSnippet": "A direct quote or very specific summary that showcases this vibe." }}
            ],
            "speakers": [
                {{ "name": "Name", "alignment": "What they focused on/agreed with", "sentimentScore": 0.5 }}
            ]
        }}
        
        Sentiment score is between -1.0 (very negative) and 1.0 (very positive).
        Do not output any text other than the JSON block.

        Transcript:
        \"\"\"
        {request.text}
        \"\"\"
        """
        response_text = generate_groq_content(prompt)
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract")
async def extract_insights(request: ExtractRequest, db: AsyncSession = Depends(get_db)):
    try:
        if not request.transcripts:
            return {"decisions": [], "actionItems": []}
            
        combined_text = "\n\n".join([f"--- {t.filename} ---\n{t.text}" for t in request.transcripts])
        
        prompt = f"""
        Analyze these meeting transcripts and extract:
        1. Key Decisions made during the meetings.
        2. Action Items assigned to individuals. For each, identify the Assignee, the Task description, the Deadline mentioned, and the Meeting sequence where it occurred.

        Format the response strictly as a JSON object:
        {{
          "decisions": [
             {{ "decision": "Description of decision", "meeting": "Filename" }}
          ],
          "actionItems": [
            {{ "assignee": "Name", "task": "Description", "deadline": "Date/Time", "meeting": "Filename" }}
          ]
        }}
        
        If an assignee or deadline is not clear, use "Unassigned" or "TBD". Do not include any other text except the JSON block.

        Transcripts:
        \"\"\"
        {combined_text}
        \"\"\"
        """
        
        response_text = generate_groq_content(prompt)
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        insights = json.loads(cleaned_text)

        # Persistence logic
        project = request.project or "Untitled Project"
        
        # Save Session
        new_session = SessionModel(
            project=project,
            user_id=request.user_id,
            created_at=datetime.utcnow(),
            insights_json=json.dumps(insights)
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        # Save Transcripts
        for t in request.transcripts:
            new_transcript = TranscriptModel(
                session_id=new_session.id,
                filename=t.filename,
                content=t.text,
                summary_json=json.dumps(t.summary) if t.summary else None,
                sentiment_json=json.dumps(t.sentiment) if t.sentiment else None
            )
            db.add(new_transcript)
        
        await db.commit()
        
        return {**insights, "session_id": new_session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
async def get_history(user_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(SessionModel).order_by(SessionModel.created_at.desc())
    if user_id:
        stmt = stmt.where(SessionModel.user_id == user_id)
    
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
async def get_session_detail(session_id: int, db: AsyncSession = Depends(get_db)):
    # Fetch session
    result = await db.execute(select(SessionModel).where(SessionModel.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
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
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(TranscriptModel).where(TranscriptModel.session_id == session_id))
    await db.execute(delete(SessionModel).where(SessionModel.id == session_id))
    await db.commit()
    return {"status": "deleted"}

@app.post("/query")
async def query_transcript(request: QueryRequest):
    try:
        combined_text = "\n\n".join([f"--- Meeting: {t.filename} ---\n{t.text}" for t in request.transcripts])
        
        prompt = f"""
        You are a helpful Meeting Assistant. You have been given the full transcript of one or more meetings.
        Please answer the user's question accurately based ONLY on the provided transcripts.
        If the answer is not contained in the transcripts, say "I cannot find the answer to that in the given meetings."
        
        CRITICAL: To support your answer, you MUST cite your source by referring to the specific Meeting filename and quoting or referencing the relevant part of the transcript.

        Transcripts:
        \"\"\"
        {combined_text}
        \"\"\"

        User Question: {request.question}
        """
        
        response_text = generate_groq_content(prompt)
        return {"answer": response_text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
