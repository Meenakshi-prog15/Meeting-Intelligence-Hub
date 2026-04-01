import { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';
import styles from './FileUploader.module.css';

export default function FileUploader({ onFileProcess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    
    // Check type
    if (!selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.vtt')) {
      setError('Please upload a valid .txt or .vtt file.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      // Pass content to parent
      await onFileProcess(text, selectedFile.name);
    } catch (err) {
      setError('Error reading file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onFileProcess]);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <h2 className={styles.title}>Upload Meeting Transcript</h2>
      <p className={styles.subtitle}>Supported formats: .txt, .vtt. Size limit: 20MB</p>
      
      <div 
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${file ? styles.success : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".txt,.vtt"
          onChange={handleChange} 
          className={styles.fileInput} 
          id="fileInput"
          disabled={isProcessing}
        />
        <label htmlFor="fileInput" className={styles.dropZoneLabel}>
          {!file ? (
            <>
              <UploadCloud size={48} className={styles.icon} />
              <span className={styles.primaryText}>Drag & drop your transcript here</span>
              <span className={styles.secondaryText}>or click to browse from your computer</span>
            </>
          ) : isProcessing ? (
             <>
               <FileText size={48} className={`${styles.icon} ${styles.pulse}`} />
               <span className={styles.primaryText}>Processing {file.name}...</span>
               <span className={styles.secondaryText}>Extracting insights via AI...</span>
             </>
          ) : (
            <>
              <CheckCircle size={48} className={styles.iconSuccess} />
              <span className={styles.primaryText}>Successfully processed {file.name}</span>
              <span className={styles.secondaryText}>Scroll down to view intelligence</span>
            </>
          )}
        </label>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
