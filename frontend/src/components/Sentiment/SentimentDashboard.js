import React, { useState } from 'react';
import styles from './SentimentDashboard.module.css';

export default function SentimentDashboard({ transcripts }) {
  const [selectedSegment, setSelectedSegment] = useState(null);

  // Aggregate sentiment data from all transcripts
  const allSegments = transcripts.flatMap(t => 
    t.sentiment?.segments?.map(s => ({
      name: s.time,
      score: s.sentimentScore,
      vibe: s.vibe,
      meeting: t.filename,
      textSnippet: s.textSnippet
    })) || []
  );

  const allSpeakers = transcripts.flatMap(t => t.sentiment?.speakers || []);
  
  // Deduplicate speakers and average their scores
  const speakerMap = new Map();
  allSpeakers.forEach(s => {
    if (!speakerMap.has(s.name)) {
      speakerMap.set(s.name, { name: s.name, scores: [s.sentimentScore], alignments: [s.alignment] });
    } else {
      const data = speakerMap.get(s.name);
      data.scores.push(s.sentimentScore);
      data.alignments.push(s.alignment);
    }
  });

  const uniqueSpeakers = Array.from(speakerMap.values()).map(s => {
    const avgScore = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
    return {
      name: s.name,
      avgScore,
      focus: s.alignments[0], // simplified focus
      vibe: avgScore > 0.2 ? 'Positive' : avgScore < -0.2 ? 'Negative' : 'Neutral'
    };
  });

  if (allSegments.length === 0) {
    return <div className={styles.empty}>No sentiment data available. Analysing...</div>;
  }

  const getBarColor = (score) => {
    if (score > 0.2) return '#4caf50'; // Green
    if (score < -0.2) return '#f44336'; // Red
    return '#ff9800'; // Orange
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Meeting Timeline Vibes</h3>
      <div className={styles.chartContainer}>
        <div className={styles.timelineContainer}>
          {allSegments.map((seg, idx) => {
             const isPositive = seg.score > 0.2;
             const isNegative = seg.score < -0.2;
             const vibeLabel = isPositive ? 'Positive 😊' : isNegative ? 'Negative 😠' : 'Neutral 😐';
             
             return (
               <div 
                 key={idx} 
                 className={styles.timelineSegment} 
                 style={{ backgroundColor: getBarColor(seg.score), cursor: 'pointer' }}
                 onClick={() => setSelectedSegment(seg)}
                 role="button"
                 title="Click to view transcript excerpt"
               >
                 <div className={styles.timelineHeader}>{seg.meeting}</div>
                 <div className={styles.timelineTime}>{seg.name}</div>
                 <div className={styles.timelineVibe}>{vibeLabel}</div>
               </div>
             );
          })}
        </div>
      </div>

      {selectedSegment && (
        <div className={styles.snippetBox}>
           <h4 className={styles.snippetTitle}>Transcript Excerpt - {selectedSegment.name} ({selectedSegment.meeting})</h4>
           <p className={styles.snippetText}>"{selectedSegment.textSnippet || 'No excerpt available for this segment.'}"</p>
        </div>
      )}

      <h3 className={styles.title}>Speaker Alignment</h3>
      <div className={styles.speakerGrid}>
        {uniqueSpeakers.map((sp, idx) => (
          <div key={idx} className={styles.speakerCard} style={{ borderTop: `4px solid ${getBarColor(sp.avgScore)}` }}>
            <h4 className={styles.speakerName}>{sp.name}</h4>
            <p className={styles.speakerVibe}>Vibe: <strong>{sp.vibe}</strong></p>
            <p className={styles.speakerFocus}>Focus: {sp.focus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
