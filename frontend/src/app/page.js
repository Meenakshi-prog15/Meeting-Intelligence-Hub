'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, ChevronDown, ChevronRight, LayoutDashboard, FileText, LucideLayout } from 'lucide-react';

// Dashboard Components
import Header from '../components/Header/Header';
import FileUploader from '../components/Upload/FileUploader';
import FileSummaryCards from '../components/Upload/FileSummaryCards';
import UploadHistory from '../components/Upload/UploadHistory';
import InsightTable from '../components/Insights/InsightTable';
import ChatInterface from '../components/Chat/ChatInterface';
import SentimentDashboard from '../components/Sentiment/SentimentDashboard';

import styles from './home.module.css';
import dashStyles from './dashboard/page.module.css';

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI-Powered Extraction',
    description:
      'Automatically identify decisions, action items, deadlines, and owners from any meeting transcript using large language models.',
    gradient: 'from-blue to-purple',
  },
  {
    icon: '💬',
    title: 'Interactive Q&A',
    description:
      'Ask natural language questions across all your uploaded meetings. Get cited, accurate answers with speaker context.',
    gradient: 'from-cyan to-blue',
  },
  {
    icon: '🎭',
    title: 'Sentiment Analysis',
    description:
      'Visualise speaker tone and emotional patterns throughout the meeting — understand who was engaged, cautious, or enthusiastic.',
    gradient: 'from-purple to-pink',
  },
  {
    icon: '📁',
    title: 'Multi-File Upload',
    description:
      'Drag-and-drop multiple .TXT or .VTT transcripts at once. Each file is validated, summarised, and cross-referenced instantly.',
    gradient: 'from-mint to-cyan',
  },
  {
    icon: '📊',
    title: 'Cross-Meeting Dashboard',
    description:
      'Aggregate stats across meetings — total decisions, action items, word counts, and speaker breakdown all in one place.',
    gradient: 'from-blue to-cyan',
  },
  {
    icon: '📤',
    title: 'Export & Share',
    description:
      'Export extracted insights as structured data. Share decision logs from individual meetings or the full cross-project view.',
    gradient: 'from-purple to-blue',
  },
];

const STEPS = [
  { number: '01', title: 'Upload Transcripts', desc: 'Drag-and-drop or select .TXT / .VTT meeting files.' },
  { number: '02', title: 'AI Processes', desc: 'Our backend extracts decisions, actions, and sentiment.' },
  { number: '03', title: 'Explore Insights', desc: 'Navigate the dashboard, chat with your data, and export.' },
];

const STATS = [
  { value: '10x', label: 'Faster than manual review' },
  { value: '99%', label: 'Action item recall' },
  { value: '∞', label: 'Meetings supported' },
  { value: '<2s', label: 'Average processing time' },
];

export default function UnifiedPage() {
  const router = useRouter();
  
  // ── AUTH STATE ────────────────────────────────
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // ── DASHBOARD STATE ───────────────────────────
  const [transcriptsData, setTranscriptsData] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [activeSection, setActiveSection] = useState('summary');
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const topDashboardRef = useRef(null);

  // ── VIEW STATE ──────────────────────────────
  const [showDashboard, setShowDashboard] = useState(true);

  // ── LANDING STATE ─────────────────────────────
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const landingHeroRef = useRef(null);

  useEffect(() => {
    // Check Auth
    const storedUser = localStorage.getItem('smartMinutesUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsAuthChecking(false);

    // Landing Page Mouse Effect
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:8000/history?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleFilesProcessed = async (filesData, project) => {
    setTranscriptsData(filesData);
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const response = await fetch('http://localhost:8000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcripts: filesData.map(f => ({ 
            filename: f.filename, 
            text: f.text,
            summary: f.summary,
            sentiment: f.sentiment
          })),
          project: project,
          user_id: user?.id
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Failed to extract insights.');
      }

      const data = await response.json();
      setInsights(data);
      setTimeout(() => {
        topDashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setExtractionError(err.message || 'Error communicating with AI service.');
    } finally {
      setIsExtracting(false);
      fetchHistory();
    }
  };

  const handleNewAnalysis = () => {
    setTranscriptsData([]);
    setInsights(null);
    setExtractionError(null);
    setUploaderKey(prev => prev + 1);
    setActiveSection('summary');
  };

  const handleLoadSession = async (sessionId) => {
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const response = await fetch(`http://localhost:8000/history/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load session');
      const data = await response.json();
      
      setTranscriptsData(data.files);
      setInsights(data.insights);
      setActiveSection('summary');
      
      setTimeout(() => {
        topDashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setExtractionError(err.message || 'Error loading past session.');
    } finally {
      setIsExtracting(false);
    }
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItems = [
    { id: 'summary',   label: '📊 Summary' },
    { id: 'insights',  label: '💡 Key Insights' },
    { id: 'qa',        label: '💬 Interactive QA' },
    { id: 'sentiment', label: '🎭 Sentiment' },
  ];

  const hasResults = transcriptsData.length > 0 && insights;

  if (isAuthChecking) return null; // Prevent flicker

  // Helper to toggle view
  const handleToggleView = (mode) => {
    setShowDashboard(mode === 'app');
    if (mode === 'landing') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartMinutesUser');
    setUser(null);
    setShowDashboard(false);
    setTranscriptsData([]);
    setInsights(null);
    router.push('/');
  };

  // ── RENDER DASHBOARD ──────────────────────────
  if (user && showDashboard) {
    return (
      <main className={dashStyles.main}>
        <Header 
          onNewAnalysis={handleNewAnalysis} 
          onToggleView={handleToggleView}
          onLogout={handleLogout}
        />

        <div className={dashStyles.pageLayout}>
          <nav className={dashStyles.sideNav}>
            {hasResults && (
              <div className={dashStyles.navSection}>
                <p className={dashStyles.sideNavTitle}>Session Explorer</p>
                {navItems.map(item => (
                  <button
                    key={item.id}
                    className={`${dashStyles.sideNavItem} ${activeSection === item.id ? dashStyles.sideNavActive : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className={dashStyles.navSection}>
              <div className={dashStyles.sideNavTitleRow} onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
                <p className={dashStyles.sideNavTitle}>Recent Analysis</p>
                {isHistoryOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              {isHistoryOpen && (
                <div className={dashStyles.historyList}>
                  {history.length === 0 ? (
                    <p className={dashStyles.emptyHistory}>No Sessions Yet</p>
                  ) : (
                    history.slice(0, 10).map((session) => (
                      <button
                        key={session.id}
                        className={`${dashStyles.historyItem} ${insights?.session_id === session.id ? dashStyles.historyActive : ''}`}
                        onClick={() => handleLoadSession(session.id)}
                      >
                        <div className={dashStyles.historyItemMeta}>
                          <FileText size={10} />
                          <span>{new Date(session.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <p className={dashStyles.historyItemTitle}>{session.project || 'Untitled Meeting'}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </nav>

          <div className={dashStyles.container}>
            <div className={dashStyles.hero}>
              <h2 className={dashStyles.title}>Capture What Matters</h2>
              <p className={dashStyles.subtitle}>AI-Powered Meeting Intelligence Hub</p>
            </div>

            {transcriptsData.length === 0 && (
              <section className={dashStyles.section}>
                <FileUploader key={uploaderKey} onFilesProcessed={handleFilesProcessed} />
              </section>
            )}

            {transcriptsData.length > 0 && !insights && !isExtracting && (
              <section className={dashStyles.section}>
                <FileSummaryCards transcripts={transcriptsData} />
              </section>
            )}

            {isExtracting && (
              <div className={dashStyles.loadingState}>
                <div className={dashStyles.spinner}></div>
                <p>Aggregating cross-meeting decisions and action items...</p>
              </div>
            )}

            {extractionError && (
              <div className={dashStyles.errorState}>
                <p>{extractionError}</p>
              </div>
            )}

            {hasResults && (
              <>
                <section id="summary" style={{ scrollMarginTop: '100px', width: '100%' }}>
                  <FileSummaryCards transcripts={transcriptsData} />
                  <div className={dashStyles.summaryStats} ref={topDashboardRef}>
                    <div className={dashStyles.statCard}>
                      <h4>Meetings</h4>
                      <p>{transcriptsData.length}</p>
                    </div>
                    <div className={dashStyles.statCard}>
                      <h4>Decisions</h4>
                      <p>{insights.decisions?.length || 0}</p>
                    </div>
                    <div className={dashStyles.statCard}>
                      <h4>Action Items</h4>
                      <p>{insights.actionItems?.length || 0}</p>
                    </div>
                  </div>
                </section>

                <div className={dashStyles.dashboardGrid}>
                  <section id="insights" style={{ scrollMarginTop: '80px' }}>
                    <h3 className={dashStyles.sectionTitle}>Key Meeting Insights</h3>
                    <InsightTable decisions={insights.decisions} actionItems={insights.actionItems} />
                  </section>

                  <section id="qa" style={{ scrollMarginTop: '80px' }}>
                    <h3 className={dashStyles.sectionTitle}>Interactive QA</h3>
                    <ChatInterface transcripts={transcriptsData} />
                  </section>
                </div>

                <section id="sentiment" className={dashStyles.sentimentSection} style={{ scrollMarginTop: '80px' }}>
                  <h3 className={dashStyles.sectionTitle}>Tone Analysis</h3>
                  <SentimentDashboard transcripts={transcriptsData} />
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── RENDER LANDING ──────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.cursorGlow} style={{ left: mousePos.x, top: mousePos.y }} />

      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <svg viewBox="0 0 24 24" fill="none" className={styles.navLogoSvg}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
            <path d="M8 12V10M12 15V9M16 12V10M4 12V11M20 12V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity="0.2" />
          </svg>
          <span>Smart<strong className="gradient-text">Minutes</strong></span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#how-it-works" className={styles.navLink}>How It Works</a>
          <Link href="/login" className={styles.navLink}>Sign In</Link>
          <button onClick={() => router.push('/login')} className={styles.navCta}>Get Started →</button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBadge}><span className={styles.heroBadgeDot} />AI-Powered Meeting Intelligence</div>
        <h1 className={styles.heroTitle}>Turn Meeting Chaos<br />Into <span className="gradient-text">Actionable Intelligence</span></h1>
        <p className={styles.heroSubtitle}>SmartMinutes transforms raw meeting transcripts into structured decisions, action items, and sentiment insights.</p>
        <div className={styles.heroCtas}>
          <Link href="/login" className={styles.heroCtaPrimary}>
            <span>Go to Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="/login" className={styles.heroCtaSecondary}>Create Account</Link>
        </div>
      </section>

      <section className={styles.statsSection} id="stats">
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.featuresSection} id="features" style={{ paddingBottom: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Everything you need from your meetings</h2>
          <p className={styles.sectionSubtitle}>From raw transcripts to rich intelligence handled instantly.</p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.howSection} id="how-it-works">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Three steps to actionable insights</h2>
        </div>
        <div className={styles.stepsGrid}>
          {STEPS.map((step, i) => (
            <div key={step.number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={step.title}>{step.title}</h3>
              <p className={step.desc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <svg viewBox="0 0 24 24" fill="none" className={styles.navLogoSvg}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
            <path d="M8 12V10M12 15V9M16 12V10M4 12V11M20 12V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Smart<strong className="gradient-text">Minutes</strong>
        </div>
        <p className={styles.footerCopy}>© 2026 Meeting Intelligence Hub · Built with Next.js + FastAPI + Gemini AI</p>
      </footer>
    </div>
  );
}
