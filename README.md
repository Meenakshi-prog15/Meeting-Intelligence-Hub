# SmartMinutes – AI Meeting Intelligence Hub

**SmartMinutes** is an AI-powered meeting intelligence platform that transforms raw meeting transcripts into structured summaries, actionable insights, key decisions, and interactive knowledge. Designed for teams and organizations, it helps users quickly understand meeting outcomes, track action items, analyze sentiment, and interact with meeting content through an AI-powered assistant.

---

## Features

### AI Meeting Summarization
- Generate concise, context-aware summaries from lengthy meeting transcripts.
- Capture key discussion points automatically.
- Reduce the time spent reviewing meetings.

### Intelligent Action Item Extraction
- Identify tasks discussed during meetings.
- Detect assignees and deadlines whenever available.
- Organize responsibilities into a structured format.

### Decision & Insight Extraction
- Automatically extract important business decisions.
- Highlight critical discussion points and strategic insights.
- Identify recurring themes across meetings.

### Sentiment & Tone Analysis
- Analyze the overall sentiment of meetings.
- Detect positive, neutral, and negative conversations.
- Understand team engagement and discussion tone.

### AI Meeting Assistant
- Chat with uploaded meeting transcripts using natural language.
- Ask questions such as:
  - *"What decisions were made?"*
  - *"What tasks were assigned to Alex?"*
  - *"Summarize Meeting 3."*
- Receive contextual, AI-generated responses.

### Cross-Meeting Analytics
- Upload multiple meeting transcripts.
- Compare discussions across meetings.
- Generate project-wide insights and trends.

### Meeting History
- Securely store previous meetings.
- Access summaries and insights anytime.
- Manage meetings through a centralized dashboard.

### User Authentication
- User registration and login.
- Individual meeting history for every account.
- JWT-based authorization.

### Modern User Interface
- Built using Next.js with a clean, responsive interface.
- Glassmorphism-inspired design.
- Interactive dashboard with smooth user experience.

---

## System Architecture

```text
                        +----------------------+
                        |    Next.js Frontend  |
                        +----------+-----------+
                                   |
                            REST API Requests
                                   |
                                   ▼
                        +----------------------+
                        |   FastAPI Backend    |
                        +----------+-----------+
                                   |
              +--------------------+--------------------+
              |                                         |
              ▼                                         ▼
      Authentication & DB                    AI Processing Pipeline
              |                                         |
              ▼                                         ▼
    PostgreSQL (+ pgvector)              Groq Llama 3 (LLM) via Celery
              |                                         |
              +--------------------+--------------------+
                                   |
                                   ▼
          Summaries • Decisions • Action Items • Insights • Chat
```

---

## Technology Stack

### Frontend
- Next.js 14
- React
- CSS Modules
- Lucide React

### Backend
- FastAPI
- Python
- SQLAlchemy
- Pydantic
- Celery + Redis (async task queue)

### AI & NLP
- Groq API
- Llama 3
- Prompt Engineering
- Structured JSON Generation

### Database
- PostgreSQL with pgvector
- SQLite (Development)

### DevOps
- Docker
- Docker Compose
- Nginx (reverse proxy)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose (recommended)
- Groq API Key

### Clone the Repository

```bash
git clone https://github.com/Meenakshi-prog15/Meeting-Intelligence-Hub.git
cd Meeting-Intelligence-Hub
```

### Environment Variables

Create a `.env` file inside the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=postgresql://username:password@db:5432/meetinghub
SECRET_KEY=your_secret_key
```

### Run Using Docker (Recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Run Without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```text
Meeting-Intelligence-Hub/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── public/
├── backend/
│   ├── main.py
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## Application Workflow

1. User logs into SmartMinutes.
2. Upload one or more meeting transcripts (.TXT or .VTT).
3. FastAPI dispatches transcript processing to Celery workers.
4. The Groq Llama 3 model extracts:
   - Meeting Summary
   - Key Decisions
   - Action Items
   - Key Insights
   - Sentiment Analysis
5. Results are stored in PostgreSQL.
6. Users interact with meetings through the AI-powered chat assistant.

---

## Future Enhancements

- Role-Based Access Control (RBAC)
- Semantic Meeting Search (pgvector)
- Speaker Identification
- Multi-language Support
- PDF & DOCX Export
- Email Notifications
- Calendar Integration
- CI/CD using GitHub Actions
- Cloud Deployment (AWS / Azure / GCP)

---

## Skills Demonstrated

- Full-Stack Development
- AI Application Development
- REST API Design
- Prompt Engineering
- Information Extraction
- Database Design
- Docker Containerization
- Modern Web Development
- Software Architecture
- LLM Integration

---

## License

This project is intended for educational, research, and portfolio purposes.
