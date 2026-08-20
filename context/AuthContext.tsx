'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WarningCircle, SignOut } from '@phosphor-icons/react/dist/ssr';

// ============================================
// Types
// ============================================

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  program: string;
  nickname?: string;
}

interface AuthContextType {
  employee: Employee | null;
  login: (
    employeeId: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  sessionOverridden: boolean;
  isVerified: boolean;
  setIsVerified: (val: boolean) => void;
  refreshVerification: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionOverridden, setSessionOverridden] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshVerification = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/recovery/google', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIsVerified(!!data.isVerified);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (employee) {
      refreshVerification();
    } else {
      setIsVerified(false);
    }
  }, [employee, refreshVerification]);

  // Reset override modal if user is already on the login page
  useEffect(() => {
    if (pathname === '/login') {
      setSessionOverridden(false);
    }
  }, [pathname]);

  // ─── Restore and live-monitor session ───
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include', // Send cookies
        });

        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.employee) {
              setEmployee(data.employee);
            } else {
              setEmployee(null);
            }
          } else {
            const data = await res.json().catch(() => ({}));
            if (data.sessionOverridden) {
              setSessionOverridden(true);
            } else {
              setEmployee(null);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setEmployee(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Live heartbeat every 1.5 seconds to immediately detect new logins on other devices
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    }, 1500);

    // Re-verify session when user switches back to this tab/window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // ─── Login ───
  const login = useCallback(
    async (
      employeeId: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ employeeId, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSessionOverridden(false);
          setEmployee(data.employee);
          return { success: true };
        }

        return {
          success: false,
          error: data.error || 'Authentication failed',
        };
      } catch {
        return {
          success: false,
          error: 'Network error. Please try again.',
        };
      }
    },
    []
  );

  // ─── Logout ───
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the server call fails, clear client state
    }

    setSessionOverridden(false);
    setEmployee(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        employee,
        login,
        logout,
        isLoading,
        sessionOverridden,
        isVerified,
        setIsVerified,
        refreshVerification,
      }}
    >
      {children}

      {/* Multi-Device Session Invalidation Modal Alert (only shown when not already on /login) */}
      {sessionOverridden && pathname !== '/login' && (
        <div className="portal-modal-backdrop" style={{ zIndex: 99999 }}>
          <div
            className="portal-modal-card discord-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-override-title"
          >
            <div className="discord-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <WarningCircle size={22} weight="bold" />
                <h2 id="session-override-title" className="discord-modal-title">
                  Session Invalidated
                </h2>
              </div>
            </div>

            <div className="discord-modal-body">
              <p className="discord-modal-desc" style={{ fontSize: '13.5px', lineHeight: '1.5' }}>
                You have been logged out because your account was logged into from another device.
              </p>
            </div>

            <div className="discord-modal-separator" />

            <div className="discord-modal-footer" style={{ padding: '16px 20px', justifyContent: 'center' }}>
              <button
                type="button"
                className="discord-modal-btn discord-modal-btn-danger"
                onClick={logout}
                style={{
                  width: '100%',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '10px 20px',
                }}
              >
                <span>Log In Again</span>
                <SignOut size={16} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
