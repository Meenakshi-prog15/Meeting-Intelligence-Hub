'use client';

import { useState } from 'react';
import Header from '../components/Header/Header';
import FileUploader from '../components/Upload/FileUploader';
import InsightTable from '../components/Insights/InsightTable';
import ChatInterface from '../components/Chat/ChatInterface';
import styles from './page.module.css';

export default function Home() {
  const [transcriptData, setTranscriptData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleFileProcess = async (text, filename) => {
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const response = await fetch('http://localhost:8000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to extract insights. Check your API key.');
      }

      const data = await response.json();
      setTranscriptData({ ...data, rawText: text });
    } catch (err) {
      setExtractionError(err.message || 'Error communicating with AI service.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleNewAnalysis = () => {
    setTranscriptData(null);
    setExtractionError(null);
    setUploaderKey(prev => prev + 1); // Forces FileUploader to remount and reset internal state
  };

  return (
    <main className={styles.main}>
      <Header onNewAnalysis={handleNewAnalysis} />
      
      <div className={styles.container}>
        <div className={styles.hero}>
          <h2 className={styles.title}>Capture What Matters</h2>
          <p className={styles.subtitle}>Upload your transcript to automatically extract decisions, action items, and query context via AI.</p>
        </div>

        <section className={styles.section}>
          <FileUploader key={uploaderKey} onFileProcess={handleFileProcess} />
        </section>

        {isExtracting && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Analysing transcript... This may take up to a minute.</p>
          </div>
        )}

        {extractionError && (
          <div className={styles.errorState}>
            <p>{extractionError}</p>
          </div>
        )}

        {transcriptData && (
          <div className={styles.dashboardGrid}>
            <section className={styles.insightsSection}>
              <h3 className={styles.sectionTitle}>Key meeting insights</h3>
              <InsightTable 
                decisions={transcriptData.decisions} 
                actionItems={transcriptData.actionItems} 
              />
            </section>
            
            <section className={styles.chatSection}>
               <h3 className={styles.sectionTitle}>Interactive QA</h3>
               <ChatInterface transcriptText={transcriptData.rawText} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
