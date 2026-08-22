'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  IdentificationCard,
  LockKey,
  Eye,
  EyeSlash,
  ArrowUpRight,
  WarningCircle,
} from '@phosphor-icons/react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { employee, isLoading, login } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && employee) {
      router.replace('/');
    }
  }, [employee, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(employeeId.trim(), password);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Invalid credentials. Please verify your Employee ID and Password.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Network connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-viewport">
      {/* MagicUI-inspired Interactive Grid Background with Radial Edge Fading */}
      <div className="login-bg-pattern-container" aria-hidden="true">
        <InteractiveGridPattern
          className="login-skew-grid"
          width={112}
          height={112}
          squares={[20, 20]}
        />
      </div>

      {/* Brand Indicator at top left (St. Anne x Repo Collaboration) */}
      <div className="login-top-bar">
        <div className="landing-brand">
          {/* St. Anne Logo (White background removed via mix-blend-mode) */}
          <div className="collab-logo-box">
            <img
              src="/logo/Logo.png"
              alt="St. Anne Logo"
              className="collab-logo-img"
            />
          </div>

          {/* Stylized Collaboration Curved X Marker */}
          <div className="collab-divider-x-svg">
            <svg width="14" height="14" viewBox="20 20 60 60" fill="none">
              <polygon points="25.5,25.5 39,25.5 76,74.5 62.5,74.5" fill="currentColor" />
              <path
                d="M65.5 25.5 C65.5 37 59.5 45.5 50 51.5 C40.5 57.5 32 64 24 74.5 L36 74.5 C43 65.5 50 60 58 54.5 C66 49 74.5 38 75.5 25.5 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Repo Logo Icon */}
          <div className="brand-icon">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#171412" />
              <path
                d="M8 9H16C18.2091 9 20 10.7909 20 13C20 15.2091 18.2091 17 16 17H8V9Z"
                stroke="#00ba58"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 17V21M14 17L18.5 21"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Repo Brand Wordmark */}
          <span className="brand-logo-text">
            Repo<span>.</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Editorial Statement + Login Card */}
      <main className="landing-grid">
        {/* Left Column: Editorial Headline & SAHS Repo Description */}
        <div className="hero-content">
          <div className="hero-kicker-wrapper">
            <span className="hero-kicker-line" />
            <span className="hero-kicker-text">DEPARTMENTAL ARCHIVE & ACCESS</span>
          </div>

          <h1 className="hero-headline">
            <span className="headline-row headline-solid">CENTRAL</span>
            <span className="headline-row headline-solid">PLACE FOR</span>
            <span className="headline-row headline-outline">DEPARTMENTAL</span>
            <span className="headline-row headline-accent">DOCUMENTS.</span>
          </h1>

          <p className="hero-description">
            SAHS Repo gives the department a single place to upload, organize, access, and retrieve official documents, records, and shared files without having to manage them across different locations.
          </p>
        </div>

        {/* Right Column: Portal Login Card */}
        <div className="login-card-container">
          <div className="portal-login-card" id="login-form">
            <div className="card-header">
              <h2 className="card-title">
                Login to Repo<span>.</span>
              </h2>
              <p className="card-subtitle">
                Enter your employee credentials to continue.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="portal-error-banner" role="alert">
                <WarningCircle size={18} weight="bold" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="portal-form">
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="employee-id" className="form-label">
                    Employee ID
                  </label>
                </div>
                <div className="form-input-container">
                  <span className="form-input-icon">
                    <IdentificationCard size={20} weight="regular" />
                  </span>
                  <input
                    id="employee-id"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. 26-008-0005"
                    required
                    autoComplete="username"
                    className="portal-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                </div>
                <div className="form-input-container">
                  <span className="form-input-icon">
                    <LockKey size={20} weight="regular" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="portal-input"
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlash size={18} weight="regular" />
                    ) : (
                      <Eye size={18} weight="regular" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="portal-submit-btn"
              >
                {isSubmitting ? (
                  <span className="portal-spinner" />
                ) : (
                  <>
                    <span>Login</span>
                    <span className="portal-btn-arrow">
                      <ArrowUpRight size={17} weight="bold" />
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="card-footer-info">
              <span>Authorized personnel only.</span>
              <a href="mailto:admin@freshstartph.site">Contact Admin</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
