'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import styles from './Header.module.css';

export default function Header({ onNewAnalysis, onToggleView, onLogout }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('smartMinutesUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer} onClick={() => onToggleView?.('landing')} style={{ cursor: 'pointer' }}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className={styles.logoSvg}
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
          <path d="M8 12V10M12 15V9M16 12V10M4 12V11M20 12V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        </svg>
        <h1 className={styles.title}>
          Smart<strong className="gradient-text">Minutes</strong>
        </h1>
      </div>
      <nav className={styles.nav}>
        {user && <button className={styles.navBtn} onClick={() => onToggleView?.('landing')}>Home</button>}
        <button className="btn-primary" onClick={onNewAnalysis}>New Analysis</button>
        {user && (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <User size={16} />
              <span>{user.username}</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
