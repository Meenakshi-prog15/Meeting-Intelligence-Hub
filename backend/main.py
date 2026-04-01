import os
import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../frontend/.env.local")

app = FastAPI(title="SmartMinutes AI Backend")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
if not api_key:
    print("Warning: GOOGLE_GENERATIVE_AI_API_KEY not found in environment")
else:
    genai.configure(api_key=api_key)

class ExtractRequest(BaseModel):
    text: str
    filename: str

class QueryRequest(BaseModel):
    question: str
    transcript: str

@app.get("/")
async def root():
    return {"status": "online", "message": "SmartMinutes Python Backend is running"}

@app.post("/extract")
async def extract_insights(request: ExtractRequest):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        Analyze the following meeting transcript and extract:
        1. Key Decisions made during the meeting. Keep them concise.
        2. Action Items assigned to individuals. For each, identify the Assignee, the Task description, and any Deadline mentioned.

        Format the response strictly as a JSON object with this shape:
        {{
          "decisions": ["Decision 1", "Decision 2"],
          "actionItems": [
            {{ "assignee": "Name", "task": "Description", "deadline": "Date/Time" }}
          ]
        }}
        
        If an assignee or deadline is not clear, use "Unassigned" or "TBD". Do not include any other text except the JSON block.

        Transcript:
        \"\"\"
        {request.text}
        \"\"\"
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean potential markdown formatting
        cleaned_text = text.replace("```json", "").replace("```", "").strip()
        
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned invalid JSON format")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_transcript(request: QueryRequest):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        You are a helpful Meeting Assistant. You have been given the full transcript of a meeting.
        Please answer the user's question accurately based ONLY on the provided transcript.
        If the answer is not contained in the transcript, say "I cannot find the answer to that in the meeting transcript."
        Try to be concise but informative.

        Transcript:
        \"\"\"
        {request.transcript}
        \"\"\"

        User Question: {request.question}
        """
        
        response = model.generate_content(prompt)
        return {"answer": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
