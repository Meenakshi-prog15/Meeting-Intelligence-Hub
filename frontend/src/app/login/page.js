'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import styles from './login.module.css';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Success! Store user and redirect
      localStorage.setItem('smartMinutesUser', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
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
          <p className={styles.subtitle}>
            {isLogin ? 'Welcome back! Sign in to your dashboard.' : 'Join SmartMinutes and start transforming meetings.'}
          </p>
        </div>

        <div className={styles.cardDivider} />

        <form className={styles.form} onSubmit={handleAuth}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Username or Email</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={isLoading}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 className="animate-spin" size={18} />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          {isLogin ? (
            <>
              Don't have an account? 
              <button className={styles.toggleBtn} onClick={() => setIsLogin(false)}>Sign up</button>
            </>
          ) : (
            <>
              Already have an account? 
              <button className={styles.toggleBtn} onClick={() => setIsLogin(true)}>Sign in</button>
            </>
          )}
        </div>

        <div className={styles.cardDivider} />

        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
