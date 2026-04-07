'use client';

import { FileText, Calendar, Users, AlignLeft, FolderOpen, Clock } from 'lucide-react';
import styles from './FileSummaryCards.module.css';

export default function FileSummaryCards({ transcripts }) {
  if (!transcripts || transcripts.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <div className={styles.sectionDot} />
          <h3 className={styles.sectionTitle}>Uploaded Files Summary</h3>
        </div>
        <span className={styles.fileCount}>
          {transcripts.length} file{transcripts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.grid}>
        {transcripts.map((t, idx) => {
          const { filename, summary, project, uploadedAt } = t;
          const date      = summary?.detected_date ?? 'Unknown';
          const speakers  = Array.isArray(summary?.speakers) ? summary.speakers : [];
          const wordCount = summary?.word_count ?? 0;
          const uploadTime = uploadedAt
            ? new Date(uploadedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '';

          // Derive file extension badge
          const ext = filename.split('.').pop().toUpperCase();

          return (
            <div key={idx} className={styles.card}>
              {/* Top accent line */}
              <div className={styles.cardAccent} />

              {/* Header row */}
              <div className={styles.cardHeader}>
                <div className={styles.extBadge}>{ext}</div>
                <span className={styles.filename} title={filename}>{filename}</span>
              </div>

              {/* Divider */}
              <hr className={styles.divider} />

              {/* Meta grid */}
              <div className={styles.metaGrid}>
                {project && (
                  <div className={styles.metaItem}>
                    <div className={styles.metaIcon} style={{ '--icon-color': 'var(--brand-secondary)' }}>
                      <FolderOpen size={13} />
                    </div>
                    <div className={styles.metaText}>
                      <span className={styles.metaLabel}>Project</span>
                      <span className={styles.metaValue}>{project}</span>
                    </div>
                  </div>
                )}

                <div className={styles.metaItem}>
                  <div className={styles.metaIcon} style={{ '--icon-color': 'var(--brand-cyan)' }}>
                    <Calendar size={13} />
                  </div>
                  <div className={styles.metaText}>
                    <span className={styles.metaLabel}>Meeting Date</span>
                    <span className={styles.metaValue}>{date}</span>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <div className={styles.metaIcon} style={{ '--icon-color': 'var(--brand-accent)' }}>
                    <AlignLeft size={13} />
                  </div>
                  <div className={styles.metaText}>
                    <span className={styles.metaLabel}>Word Count</span>
                    <span className={styles.metaValue}>{wordCount.toLocaleString()}</span>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <div className={styles.metaIcon} style={{ '--icon-color': 'var(--brand-primary)' }}>
                    <Users size={13} />
                  </div>
                  <div className={styles.metaText}>
                    <span className={styles.metaLabel}>Speakers</span>
                    <span className={styles.metaValue}>{speakers.length > 0 ? speakers.length : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Speaker badges */}
              {speakers.length > 0 && (
                <div className={styles.speakersSection}>
                  <span className={styles.speakersLabel}>Participants</span>
                  <div className={styles.speakersRow}>
                    {speakers.map((name, i) => (
                      <span key={i} className={styles.speakerBadge}>
                        <span className={styles.speakerInitial}>{name.charAt(0).toUpperCase()}</span>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              {uploadTime && (
                <div className={styles.footer}>
                  <Clock size={11} />
                  <span>Uploaded {uploadTime}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
