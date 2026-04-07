'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, FileText, FolderOpen, Loader2 } from 'lucide-react';
import styles from './FileUploader.module.css';

const ALLOWED_EXTENSIONS = ['.txt', '.vtt'];

export default function FileUploader({ onFilesProcessed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [projectName, setProjectName] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const validateFiles = (fileList) => {
    const all = Array.from(fileList);
    const invalid = all.filter(
      (f) => !ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    const valid = all.filter((f) =>
      ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    if (all.length === 0) return { valid: [], errorMsg: '' };

    if (valid.length === 0) {
      const names = invalid.map((f) => f.name).join(', ');
      return {
        valid: [],
        errorMsg: `❌ Unsupported file type(s): ${names}. Only .txt and .vtt files are accepted.`,
      };
    }

    if (invalid.length > 0) {
      const names = invalid.map((f) => f.name).join(', ');
      return {
        valid,
        errorMsg: `⚠️ Skipped unsupported file(s): ${names}. Processing only .txt / .vtt files.`,
      };
    }

    return { valid, errorMsg: '' };
  };

  const processFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const { valid, errorMsg } = validateFiles(fileList);
    setError(errorMsg);

    if (valid.length === 0) return;

    setIsProcessing(true);
    const transcriptsData = [];
    const project = projectName.trim() || 'Untitled Project';

    try {
      for (const file of valid) {
        setStatusText(`Reading ${file.name}…`);
        const text = await file.text();

        setStatusText(`Fetching summary for ${file.name}…`);
        const summaryRes = await fetch('http://localhost:8000/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, filename: file.name }),
        });
        const summary = summaryRes.ok ? await summaryRes.json() : null;

        setStatusText(`Analyzing sentiment for ${file.name}…`);
        const sentimentRes = await fetch('http://localhost:8000/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, filename: file.name }),
        });
        const sentiment = sentimentRes.ok ? await sentimentRes.json() : null;

        transcriptsData.push({
          filename: file.name,
          text,
          summary,
          sentiment,
          project,
          uploadedAt: new Date().toISOString(),
        });
      }

      setStatusText('Extracting cross-meeting insights… (may take a moment)');
      await onFilesProcessed(transcriptsData, project);
    } catch (err) {
      setError('❌ Error processing files. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [projectName]
  );

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <h2 className={styles.title}>Upload Meeting Transcripts</h2>
      <p className={styles.subtitle}>
        Supported: <strong>.txt</strong> &amp; <strong>.vtt</strong> — select multiple files for cross-meeting analysis.
      </p>

      {/* Project name input */}
      <div className={styles.projectRow}>
        <FolderOpen size={16} className={styles.projectIcon} />
        <input
          type="text"
          className={styles.projectInput}
          placeholder="Project name (optional, e.g. Q2 Planning)"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Drop zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".txt,.vtt"
          multiple
          onChange={handleChange}
          className={styles.fileInput}
          id="fileInput"
          disabled={isProcessing}
        />
        <label htmlFor="fileInput" className={styles.dropZoneLabel}>
          {!isProcessing ? (
            <>
              <div className={styles.iconWrap}>
                <UploadCloud size={32} className={styles.icon} />
              </div>
              <span className={styles.primaryText}>Drag &amp; drop transcripts here</span>
              <span className={styles.secondaryText}>or click to browse — multiple files supported</span>
              <div className={styles.formatBadges}>
                <span className={styles.formatBadge}>.TXT</span>
                <span className={styles.formatBadge}>.VTT</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.iconWrap}>
                <FileText size={28} className={`${styles.iconProcessing} ${styles.pulse}`} />
              </div>
              <span className={styles.primaryText}>{statusText}</span>
              <span className={styles.secondaryText}>Processing with AI…</span>
            </>
          )}
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
