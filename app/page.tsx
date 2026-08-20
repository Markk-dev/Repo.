'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  CaretDown,
  CaretLeft,
  GearSix,
  MagnifyingGlass,
  MegaphoneSimple,
  PaperPlaneTilt,
  PlusCircle,
  PushPin,
  ShieldCheck,
  SignOut,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { UserSettingsModal } from '@/components/settings/UserSettingsModal';

export default function DashboardPage() {
  const { employee, logout, isLoading, sessionOverridden, isVerified } = useAuth();
  const router = useRouter();
  const [activeRail, setActiveRail] = useState('dept-sahs');
  const [activeNavigation, setActiveNavigation] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !employee && !sessionOverridden) {
      router.push('/login');
    }
  }, [employee, isLoading, router, sessionOverridden]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsModalOpen) setSettingsModalOpen(false);
        if (logoutModalOpen) setLogoutModalOpen(false);
        if (userMenuOpen) setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logoutModalOpen, settingsModalOpen, userMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('settings=open')) {
      setSettingsModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (isLoading || !employee) {
    return (
      <div className="portal-loading-screen" role="status" aria-label="Loading">
        <div className="portal-loading-spinner" />
      </div>
    );
  }

  const handleNavSelect = (navItem: string) => {
    setActiveNavigation(navItem);
    if (userMenuOpen) setUserMenuOpen(false);
    setMobileNavOpen(false);
  };

  // Dynamic Navigation / Channel Title
  return (
    <div className="discord-window-frame">
      {/* 1. Discord Top Window Title Bar */}
      <header className="discord-titlebar" aria-label="Window Navigation">
        <div className="discord-titlebar-content">
          <span className="discord-titlebar-name">St. Anne College Lucena, Inc.</span>
        </div>
      </header>

      {/* 2. Main App Container (Rail, Sidebar, Main Workspace) */}
      <div className="discord-app-layout">
        {/* Navigation Container (Rail + Sidebar) - On mobile, acts as full-screen server/channels view */}
        <div className={`discord-nav-container ${mobileNavOpen ? 'mobile-nav-active' : ''}`}>
          {/* 1. Leftmost Icon Rail */}
          <nav className="discord-rail" aria-label="Department Navigation">
            <div className="rail-top-group">
              <div
                className={`rail-item-wrapper ${activeRail === 'dept-sahs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveRail('dept-sahs');
                  setActiveNavigation(null);
                }}
              >
                <div className="rail-pill-indicator" />
                <div className="rail-squircle">
                  <img
                    src="/logo/Logo.png"
                    alt="SACLI Logo"
                    className="rail-sacli-logo"
                  />
                </div>
                <div className="rail-tooltip">
                  <div className="rail-tooltip-arrow" />
                  <span>SAHS Department Repository</span>
                </div>
              </div>
            </div>
          </nav>

          {/* 2. Secondary Channel & Category Sidebar */}
          <aside className="discord-sidebar">
            {/* Top Header of Sidebar (Aligned with main topbar line) */}
            <div className="sidebar-topbar">
              <button
                type="button"
                className={`sidebar-announcement-btn ${activeNavigation === 'Announcement' ? 'active' : ''}`}
                onClick={() => handleNavSelect('Announcement')}
                aria-label="Announcement"
              >
                <MegaphoneSimple size={16} weight="regular" />
                <span>Announcement</span>
              </button>
            </div>

            {/* Clean scrollable sidebar area */}
            <div className="sidebar-channels-scroll" />
          </aside>

          {/* Discord-style Floating Bottom User Profile Bar (Spanning across rail and sidebar) */}
          <div className="discord-user-bar-container" ref={userMenuRef}>
            {/* Upward Popover Menu */}
            {userMenuOpen && (
              <div className="discord-user-popover" role="menu">
                <div className="user-popover-header">
                  <div className="user-popover-info">
                    <div className="user-popover-identity-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="user-popover-name">{employee?.name || 'Employee'}</span>
                        {isVerified && (
                          <ShieldCheck size={14} weight="fill" style={{ color: '#00ba58', flexShrink: 0 }} />
                        )}
                      </div>
                      <span className="user-popover-pos">{employee?.position || 'Department Staff'}</span>
                    </div>
                    <span className="user-popover-id">ID: {employee?.employeeId}</span>
                  </div>
                </div>
                <div className="user-popover-divider" />
                <button
                  type="button"
                  className="user-popover-item danger"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setLogoutModalOpen(true);
                  }}
                  role="menuitem"
                >
                  <SignOut size={16} weight="bold" />
                  <span>Log Out</span>
                </button>
              </div>
            )}

            {/* Floating Pill Bar */}
            <div className="discord-user-bar">
              <div
                className="discord-user-profile"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={`${employee?.name || 'Employee'} (${employee?.position || 'Staff'})`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setUserMenuOpen(!userMenuOpen);
                  }
                }}
              >
                <div className="discord-user-avatar">
                  {employee?.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="discord-user-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="discord-user-name">
                      {employee?.name ? employee.name.split(' ')[0] : 'User'}
                    </span>
                    {isVerified && (
                      <div className="verified-badge-wrapper" aria-label="Verified Profile">
                        <ShieldCheck size={14} weight="fill" className="verified-badge-icon" />
                        <div className="verified-tooltip" role="tooltip">
                          <div className="verified-tooltip-arrow" />
                          <span>Verified Profile (Google)</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="discord-user-position">
                    {employee?.position || 'Staff'}
                  </span>
                </div>
              </div>

              <div className="discord-user-actions">
                <button
                  type="button"
                  className={`discord-user-action-btn discord-caret-btn ${userMenuOpen ? 'active' : ''}`}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User Options"
                  title="Options"
                >
                  <CaretDown size={13} weight="bold" className="discord-caret-icon" />
                </button>
                <button
                  type="button"
                  className="discord-user-action-btn discord-settings-btn"
                  onClick={() => {
                    if (userMenuOpen) setUserMenuOpen(false);
                    setSettingsModalOpen(true);
                  }}
                  aria-label="User Settings"
                  title="Settings"
                >
                  <GearSix size={18} weight="fill" className="discord-gear-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Content Workspace */}
        <main className="discord-main">
          {/* Top Header (Aligned with sidebar topbar line) */}
          <header className="discord-topbar">
            <div className="topbar-left">
              {/* Mobile Back Button to navigate back to Channels View */}
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Back to channels"
                title="Channels"
              >
                <CaretLeft size={20} weight="bold" />
              </button>
            </div>

            <div className="topbar-right">
              <div className="topbar-search">
                <MagnifyingGlass size={15} weight="bold" style={{ color: '#8C817B' }} />
                <input type="text" placeholder="Search files..." aria-label="Search files" />
              </div>

              <button className="user-action-btn mobile-search-btn" title="Search" aria-label="Search">
                <MagnifyingGlass size={18} weight="bold" />
              </button>

              <button className="user-action-btn" title="Pinned Documents" aria-label="Pins">
                <PushPin size={18} weight="regular" />
              </button>
            </div>
          </header>

          {/* Empty Clean Content Canvas */}
          <div className="discord-scrollable-content discord-empty-canvas" />

          {/* Bottom Chat Message Bar (Matching Profile Pane Height & Styling) */}
          <div className="discord-chat-container">
            <div className="discord-chat-bar">
              <button
                type="button"
                className="discord-chat-attach-btn"
                title="Attach Document or File"
                aria-label="Attach file"
              >
                <PlusCircle size={22} weight="fill" />
              </button>

              <input
                type="text"
                className="discord-chat-input"
                placeholder="Place an announcement..."
                aria-label="Announcement input"
              />

              <div className="discord-chat-actions">
                <button
                  type="button"
                  className="discord-chat-action-btn"
                  title="Send message"
                  aria-label="Send"
                >
                  <PaperPlaneTilt size={18} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 4. Discord User Settings Modal / Mobile Drawer */}
      <UserSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        employee={employee}
      />

      {/* 5. Logout Confirmation Warning Modal */}
      {logoutModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setLogoutModalOpen(false)}
          role="presentation"
        >
          <div
            className="portal-modal-card discord-logout-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <div className="discord-modal-header">
              <h2 id="logout-modal-title" className="discord-modal-title">
                Log Out
              </h2>
              <button
                className="discord-modal-close-btn"
                onClick={() => setLogoutModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="discord-modal-body">
              <p className="discord-modal-desc">
                Are you sure you want to logout?
              </p>
            </div>

            {/* Separator line between description and buttons */}
            <div className="discord-modal-separator" />

            <div className="discord-modal-footer">
              <button
                type="button"
                className="discord-modal-btn discord-modal-btn-cancel"
                onClick={() => setLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="discord-modal-btn discord-modal-btn-danger"
                onClick={logout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
