# SmartMinutes — AI Meeting Intelligence Hub

Transform your raw meeting transcripts into structured decisions, automated action items, and cross-project intelligence with a professional, unified experience.

![SmartMinutes Dashboard Preview](https://github.com/Meenakshi-prog15/Meeting-Intelligence-Hub/raw/main/preview.png)

## 🚀 Key Features

- **Unified Home & Dashboard**: A dynamic experience that transforms from a professional landing page to a powerful AI workspace as soon as you sign in.
- **Secure Authentication**: Built-in user account management (Sign Up/Log In) with isolated meeting history for every user.
- **Cross-Meeting Analytics**: Upload multiple transcripts simultaneously to get aggregate insights across entire projects or quarters.
- **Automated Insights**:
  - **Decisions**: Instant extraction of critical meeting outcomes.
  - **Action Items**: Automatically identifies assignees, tasks, and deadlines.
  - **Sentiment & Tone**: Real-time analysis of team sentiment and speaker tone.
- **Interactive QA Assistant**: Chat directly with your transcripts and get cited answers about what alex said or what happened in meeting X.
- **Glassmorphism UI**: A premium, centered design with smooth micro-animations and a persistent session explorer.

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** & React
- **CSS Modules** for custom, high-end styling
- **Lucide React** for beautiful iconography
- **State-driven Navigation** for a seamless unified experience

### Backend
- **FastAPI** (Python) for asynchronous, high-performance API handling
- **SQLite + SQLAlchemy (Ext)** for secure, local user and session persistence
- **Groq AI (Llama 3)** for lightning-fast meeting transcript analysis and structured extraction
- **Pydantic** for robust data validation

---

## 🚦 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **Groq API Key**: Get your free key at [Groq Console](https://console.groq.com/keys)

### 1. Repository Setup
```bash
git clone https://github.com/Meenakshi-prog15/Meeting-Intelligence-Hub.git
cd Meeting-Intelligence-Hub
```

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. The database (`meetings.db`) will be automatically initialized on the first run.

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and add your Groq API Key:
   ```env
   GROQ_API_KEY=your_groq_key_here
   ```

### 4. Running the App
1. **Start the API**: In the `backend` folder, run `python main.py`.
2. **Start the Dashboard**: In the `frontend` folder, run `npm run dev`.
3. Open `http://localhost:3001` in your browser.

---

## 🏗️ Architecture

SmartMinutes uses a decoupled architecture where the **Next.js** frontend handles the dynamic UI and local state, while the **FastAPI** backend manages the AI orchestration and SQLite persistence. Meeting transcripts are processed in parallel before being aggregated by the LLM for cross-meeting intelligence.

## 📄 License
© 2026 Meeting Intelligence Hub · Built with Next.js, FastAPI, and Groq.