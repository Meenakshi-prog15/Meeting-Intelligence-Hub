import os
import json
from celery import Celery
from groq import Groq

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def generate_groq_content(prompt: str) -> str:
    if not client:
        return json.dumps({"error": "Groq API key not configured"})
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return json.dumps({"error": str(e)})

@celery_app.task(name="extract_insights_task")
def extract_insights_task(combined_text: str):
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
    try:
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        return {"error": "Failed to parse JSON", "raw": response_text}

@celery_app.task(name="extract_summary_task")
def extract_summary_task(text: str, filename: str):
    prompt = f"""
    Analyze this meeting transcript strictly to extract metadata.
    Return ONLY a JSON object with these keys:
    - "detected_date": (string, e.g. "2024-03-27" or "Unknown")
    - "speakers": (list of strings, e.g. ["Alex", "Priya"])
    - "summary": (brief 2-sentence summary)
    
    Transcript filename: {filename}
    Transcript: 
    \"\"\"
    {text[:4000]} 
    \"\"\"
    """
    response_text = generate_groq_content(prompt)
    try:
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except Exception:
        return {"error": "Failed to parse summary JSON", "raw": response_text}

@celery_app.task(name="get_sentiment_task")
def get_sentiment_task(text: str):
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
    {text}
    \"\"\"
    """
    response_text = generate_groq_content(prompt)
    try:
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except Exception:
        return {"error": "Failed to parse sentiment JSON", "raw": response_text}

@celery_app.task(name="query_transcript_task")
def query_transcript_task(combined_text: str, question: str):
    prompt = f"""
    You are a helpful Meeting Assistant. You have been given the full transcript of one or more meetings.
    Please answer the user's question accurately based ONLY on the provided transcripts.
    If the answer is not contained in the transcripts, say "I cannot find the answer to that in the given meetings."
    
    CRITICAL: To support your answer, you MUST cite your source by referring to the specific Meeting filename and quoting or referencing the relevant part of the transcript.

    Transcripts:
    \"\"\"
    {combined_text}
    \"\"\"

    User Question: {question}
    """
    response_text = generate_groq_content(prompt)
    return {"answer": response_text}
