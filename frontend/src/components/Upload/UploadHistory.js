'use client';

import { useState, useEffect } from 'react';
import { History, FolderOpen, FileText, Trash2, ChevronDown, ChevronRight, Clock, Hash } from 'lucide-react';
import styles from './UploadHistory.module.css';

function groupByProject(sessions) {
  const map = {};
  for (const session of sessions) {
    const key = session.project || 'Untitled Project';
    if (!map[key]) map[key] = [];
    map[key].push(session);
  }
  return map;
}

// Generate a hue from a string so each project gets a consistent color
function projectHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export default function UploadHistory({ onLoadSession, refreshTrigger }) {
  const [sessions, setSessions] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open || refreshTrigger) {
      fetchHistory();
    }
  }, [open, refreshTrigger]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/history');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all history from the database?')) return;
    try {
      for (const session of sessions) {
        await fetch(`http://localhost:8000/history/${session.id}`, { method: 'DELETE' });
      }
      setSessions([]);
    } catch (err) {
      console.error('Failed to clear sessions:', err);
    }
  };

  const toggleProject = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (sessions.length === 0 && !open) return null;

  const grouped = groupByProject(sessions);

  return (
    <div className={styles.wrapper}>
      <button className={styles.toggleBtn} onClick={() => setOpen((o) => !o)}>
        <span className={styles.toggleIcon}><History size={13} /></span>
        <span>Upload History</span>
        {sessions.length > 0 && (
          <span className={styles.badge}>{sessions.length}</span>
        )}
        <span className={styles.chevron}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>

      {open && (
        <div className={styles.panel}>
          {sessions.length === 0 ? (
            <div className={styles.empty}>
              <History size={24} className={styles.emptyIcon} />
              <p>No past sessions recorded yet.</p>
            </div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Past Upload Sessions</span>
                <button className={styles.clearBtn} onClick={clearHistory}>
                  <Trash2 size={11} /> Clear all
                </button>
              </div>

              <div className={styles.projectList}>
                {Object.entries(grouped).map(([project, projectSessions]) => {
                  const hue = projectHue(project);
                  const isOpen = expanded[project];
                  return (
                    <div key={project} className={styles.projectGroup}>
                      <button
                        className={styles.projectToggle}
                        style={{ '--project-hue': hue }}
                        onClick={() => toggleProject(project)}
                      >
                        <span className={styles.projectDot} style={{ background: `hsl(${hue}, 70%, 60%)` }} />
                        <FolderOpen size={13} className={styles.folderIcon} />
                        <span className={styles.projectName}>{project}</span>
                        <span className={styles.sessionCount}>
                          {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''}
                        </span>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {isOpen && (
                        <div className={styles.sessionList}>
                          {projectSessions.map((session) => {
                            return (
                              <div key={session.id} className={styles.sessionCard}>
                                {/* Session meta bar */}
                                <div className={styles.sessionMeta}>
                                  <div className={styles.sessionMetaLeft}>
                                    <span className={styles.sessionMetaItem}>
                                      <Clock size={10} />
                                      {new Date(session.uploadedAt).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })}
                                    </span>
                                  </div>
                                  <div className={styles.sessionMetaRight}>
                                    <button 
                                      className={styles.viewBtn} 
                                      onClick={() => onLoadSession(session.id)}
                                    >
                                      Load Analysis
                                    </button>
                                  </div>
                                </div>

                                {/* File rows */}
                                <div className={styles.fileRows}>
                                  {session.files?.map((f, i) => (
                                    <div key={i} className={styles.fileRow}>
                                      <span className={styles.fileRowDot} />
                                      <span className={styles.fileRowName} title={f.filename}>
                                        {f.filename}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
