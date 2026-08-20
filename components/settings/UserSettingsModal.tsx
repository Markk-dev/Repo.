'use client';

import { useEffect, useRef, useState } from 'react';
import {
  User,
  X,
  CaretRight,
  DotsThree,
  MagnifyingGlass,
  Check,
  Copy,
  Eye,
  EyeSlash,
  Laptop,
  DeviceMobileCamera,
  DeviceTabletSpeaker,
  ArrowLeft,
  UploadSimple,
  Trash,
  ShieldCheck,
  Info,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import { Employee } from '@/context/AuthContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

type SectionKey = 'account-info' | 'password-security';
type ViewKey = 'main' | 'logged-in-devices' | 'mfa';

interface DeviceItem {
  id: string;
  os: string;
  browser: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string | null;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SwipeableSettingsRowProps {
  label: string;
  value: React.ReactNode;
  actionButton?: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
  rightArrow?: boolean;
  swipeOffset?: number;
}

function SwipeableSettingsRow({
  label,
  value,
  actionButton,
  onClick,
  clickable,
  rightArrow,
  swipeOffset,
}: SwipeableSettingsRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const initialOffset = useRef<number>(0);
  const maxRevealOffset = swipeOffset || -85;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!actionButton) return;
    touchStartX.current = e.touches[0].clientX;
    initialOffset.current = offsetX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !actionButton) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    let nextOffset = initialOffset.current + diff;
    if (nextOffset > 0) nextOffset = 0;
    if (nextOffset < maxRevealOffset - 25) nextOffset = maxRevealOffset - 25;
    setOffsetX(nextOffset);
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || !actionButton) return;
    touchStartX.current = null;
    setIsDragging(false);
    if (offsetX < maxRevealOffset / 2.5) {
      setOffsetX(maxRevealOffset);
    } else {
      setOffsetX(0);
    }
  };

  const handleContentClick = () => {
    if (offsetX !== 0) {
      setOffsetX(0);
      return;
    }
    if (onClick) onClick();
  };

  return (
    <div className={`settings-row-wrapper ${clickable ? 'clickable' : ''}`}>
      {actionButton && (
        <div className="settings-row-action-revealed">
          {actionButton}
        </div>
      )}
      <div
        className={`settings-row ${clickable ? 'settings-row-clickable' : ''} ${
          !actionButton ? 'settings-row-full' : ''
        }`}
        style={{
          transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        <span className="settings-row-label">{label}</span>
        <span className="settings-row-value">{value}</span>
        {actionButton && (
          <>
            <div className="settings-row-desktop-action">
              {actionButton}
            </div>
            <div className="settings-row-mobile-arrow">
              <CaretRight size={14} weight="bold" />
            </div>
          </>
        )}
        {rightArrow && !actionButton && (
          <div className="settings-row-right">
            <CaretRight size={15} weight="bold" />
          </div>
        )}
      </div>
    </div>
  );
}

export function UserSettingsModal({
  isOpen,
  onClose,
  employee,
}: UserSettingsModalProps) {
  const [currentView, setCurrentView] = useState<ViewKey>('main');
  const [activeSection, setActiveSection] = useState<SectionKey>('account-info');
  const [emailRevealed, setEmailRevealed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Change Password Sub-Modal State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Logged-in Devices State
  const [currentDevice, setCurrentDevice] = useState<DeviceItem | null>(null);
  const [otherDevices, setOtherDevices] = useState<DeviceItem[]>([]);
  const [totalDevicesCount, setTotalDevicesCount] = useState(1);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Google Account Linking & Verification State (for recovery & MFA)
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialFeedback, setSocialFeedback] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const accountInfoRef = useRef<HTMLDivElement>(null);
  const passwordSecurityRef = useRef<HTMLDivElement>(null);

  // Avatar dropdown menu state
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarMenuOpen]);

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDrawerTranslateY(0);
    }, 240);
  };

  // Reset view & fetch status on open/close
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDrawerTranslateY(0);
      fetchDevices();
      fetchGoogleStatus();
    } else {
      setCurrentView('main');
      setAvatarMenuOpen(false);
    }
  }, [isOpen]);

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/recovery/google');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
        setIsVerified(data.isVerified);
        if (data.email) setGoogleEmail(data.email);
      }
    } catch (e) {
      console.warn('Failed to fetch Google recovery status:', e);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (changePasswordOpen) {
          setChangePasswordOpen(false);
        } else if (currentView !== 'main') {
          setCurrentView('main');
        } else if (isOpen) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, changePasswordOpen, currentView, isClosing]);

  // Fetch Logged-in Devices
  const fetchDevices = async () => {
    try {
      setIsLoadingDevices(true);
      const res = await fetch('/api/auth/devices');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentDevice(data.currentDevice);
          setOtherDevices(data.otherDevices || []);
          setTotalDevicesCount(data.totalCount || 1);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (sessionId: string) => {
    try {
      const res = await fetch('/api/auth/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setOtherDevices((prev) => prev.filter((d) => d.id !== sessionId));
        setTotalDevicesCount((prev) => Math.max(1, prev - 1));
      }
    } catch (e) {
      console.warn('Failed to revoke session:', e);
    }
  };

  // Scrollspy: Observe visible section as user scrolls
  useEffect(() => {
    if (!isOpen || currentView !== 'main') return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const passwordSecurityEl = passwordSecurityRef.current;
      if (!passwordSecurityEl) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const passSecTop = passwordSecurityEl.getBoundingClientRect().top - containerTop;

      // When the Password & Security section scrolls to near the top
      if (passSecTop <= 240) {
        setActiveSection('password-security');
      } else {
        setActiveSection('account-info');
      }
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isOpen, currentView]);

  const scrollToSection = (section: SectionKey) => {
    setActiveSection(section);
    const scrollContainer = scrollContainerRef.current;
    const targetEl =
      section === 'account-info'
        ? accountInfoRef.current
        : passwordSecurityRef.current;

    if (targetEl && scrollContainer) {
      const targetTop = targetEl.offsetTop - scrollContainer.offsetTop - 8;
      scrollContainer.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  };

  const copyEmployeeId = () => {
    if (employee?.employeeId) {
      navigator.clipboard.writeText(employee.employeeId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleOpenChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setChangePasswordOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all required fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordError(data.error || 'Failed to update password');
        setIsSubmittingPassword(false);
        return;
      }

      setPasswordSuccess('Password updated successfully!');
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1400);
    } catch {
      setPasswordError('An unexpected network error occurred');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Google account connection handler with real API sync
  const handleToggleGoogle = async () => {
    setSocialLoading('google');
    try {
      if (googleConnected) {
        const res = await fetch('/api/auth/recovery/google', { method: 'DELETE' });
        if (res.ok) {
          setGoogleConnected(false);
          setIsVerified(false);
          setGoogleEmail(null);
          setSocialFeedback('Google account disconnected. Profile is now unverified.');
        }
      } else {
        const defaultEmail = `${employee?.employeeId?.toLowerCase() || 'mark.madrid'}@gmail.com`;
        const res = await fetch('/api/auth/recovery/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: defaultEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleConnected(true);
          setIsVerified(true);
          setGoogleEmail(data.email || defaultEmail);
          setSocialFeedback('Google account connected! Profile is now verified for emergency recovery.');
        }
      }
    } catch {
      setSocialFeedback('Network error updating Google connection status.');
    } finally {
      setSocialLoading(null);
      setTimeout(() => setSocialFeedback(null), 3500);
    }
  };

  // Mobile drawer drag gesture state with PointerCapture for instant responsiveness
  const [drawerTranslateY, setDrawerTranslateY] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const drawerDragStartY = useRef<number | null>(null);

  const handleDrawerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only enable dragging on mobile viewports (<= 768px) and touch/pen devices
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawerDragStartY.current = e.clientY;
    setIsDraggingDrawer(true);
  };

  const handleDrawerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawerDragStartY.current === null || !isDraggingDrawer) return;
    const diff = e.clientY - drawerDragStartY.current;
    if (diff > 0) {
      setDrawerTranslateY(diff);
    } else {
      setDrawerTranslateY(0);
    }
  };

  const handleDrawerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawerDragStartY.current === null) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    drawerDragStartY.current = null;
    setIsDraggingDrawer(false);
    if (drawerTranslateY > 70) {
      handleClose();
    } else {
      setDrawerTranslateY(0);
    }
  };

  if (!isOpen) return null;

  const formatDeviceTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div
      className={`portal-modal-backdrop settings-modal-backdrop ${isClosing ? 'backdrop-closing' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`settings-modal-card ${isClosing ? 'drawer-closing modal-closing' : ''}`}
        style={{
          transform: drawerTranslateY > 0 ? `translateY(${drawerTranslateY}px)` : undefined,
          transition: isDraggingDrawer ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        {/* Mobile Drag Indicator Area with large touch target */}
        <div
          className="settings-mobile-drag-handle-area"
          onPointerDown={handleDrawerPointerDown}
          onPointerMove={handleDrawerPointerMove}
          onPointerUp={handleDrawerPointerUp}
          onPointerCancel={handleDrawerPointerUp}
          aria-label="Drag down to close"
        >
          <div className="settings-mobile-drag-handle" />
        </div>

        {/* 1. Left Sidebar Pane (Discord Style) */}
        <aside className="settings-sidebar">
          {/* User Profile Preview Card */}
          <div className="settings-sidebar-user">
            <div className="settings-user-avatar">
              {employee?.name ? employee.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="settings-user-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="settings-user-name">
                  {employee?.name || 'Mark Vincent Madrid'}
                </span>
                {isVerified && (
                  <span title="Profile Verified via Google" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <ShieldCheck
                      size={15}
                      weight="fill"
                      style={{ color: '#00ba58', flexShrink: 0 }}
                    />
                  </span>
                )}
              </div>
              <span className="settings-user-role">
                {employee?.position || 'Administrative Assistant'}
              </span>
            </div>
          </div>

          {/* Quick Search Field */}
          <div className="settings-search-box">
            <MagnifyingGlass size={14} weight="bold" />
            <input type="text" placeholder="Search settings..." aria-label="Search settings" />
          </div>

          {/* Navigation Tree */}
          <nav className="settings-nav">
            {/* Account Group */}
            <div className="settings-nav-group">
              <div
                className={`settings-nav-parent ${currentView === 'main' ? 'active' : ''}`}
                onClick={() => setCurrentView('main')}
              >
                <User size={16} weight="bold" />
                <span>Account</span>
              </div>

              {/* Sub-tree Navigation with Vertical Active Sliding Rail */}
              <div className="settings-subnav-tree">
                <div className="settings-subnav-track" />
                <div
                  className="settings-subnav-indicator"
                  style={{
                    transform:
                      activeSection === 'password-security' && currentView === 'main'
                        ? 'translateY(36px)'
                        : 'translateY(0px)',
                  }}
                />
                <div className="settings-subnav-items">
                  <button
                    type="button"
                    className={`settings-subnav-btn ${activeSection === 'account-info' && currentView === 'main' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView('main');
                      scrollToSection('account-info');
                    }}
                  >
                    Account Info
                  </button>
                  <button
                    type="button"
                    className={`settings-subnav-btn ${activeSection === 'password-security' && currentView === 'main' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView('main');
                      scrollToSection('password-security');
                    }}
                  >
                    Password &amp; Security
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* 2. Right Main Settings Pane */}
        <main className="settings-main">
          {currentView === 'main' ? (
            <>
              {/* Header with Title and Close Button */}
              <header className="settings-header">
                <h1 id="settings-dialog-title" className="settings-title">
                  <span className="desktop-title">Account</span>
                  <span className="mobile-title">
                    {activeSection === 'password-security' ? 'Password & Security' : 'Account Info'}
                  </span>
                </h1>
                <button
                  type="button"
                  className="settings-close-btn"
                  onClick={handleClose}
                  aria-label="Close settings"
                >
                  <X size={16} weight="bold" />
                </button>
              </header>

              {/* Scrollable Content Container */}
              <div className="settings-content-scroll" ref={scrollContainerRef}>
                {/* Section 1: Account Info */}
                <section
                  id="account-info"
                  ref={accountInfoRef}
                  className="settings-section"
                >
                  <h2 className="settings-section-title">Account Info</h2>

                  <div className="settings-card-group">
                    {/* Full Name */}
                    <SwipeableSettingsRow
                      label="Full Name"
                      value={employee?.name || 'Mark Vincent Madrid'}
                      actionButton={
                        <button type="button" className="settings-action-btn">
                          Edit
                        </button>
                      }
                    />

                    {/* Email */}
                    <SwipeableSettingsRow
                      label="Email"
                      value={
                        <span>
                          {emailRevealed
                            ? `${employee?.employeeId?.toLowerCase() || 'emp'}@sacli.edu.ph`
                            : '••••••••••••••••@sacli.edu.ph'}
                        </span>
                      }
                      swipeOffset={-148}
                      actionButton={
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="settings-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmailRevealed(!emailRevealed);
                            }}
                          >
                            {emailRevealed ? 'Hide' : 'Reveal'}
                          </button>
                          <button type="button" className="settings-action-btn">
                            Edit
                          </button>
                        </div>
                      }
                    />

                    {/* Employee ID (Read-only, static) */}
                    <SwipeableSettingsRow
                      label="Employee ID"
                      value={employee?.employeeId || '26-008-0005'}
                    />

                    {/* Department Position (Read-only, static) */}
                    <SwipeableSettingsRow
                      label="Department Position"
                      value={
                        <span className="settings-position-green">
                          {employee?.position || 'Administrative Assistant'}
                        </span>
                      }
                    />
                  </div>
                </section>

                {/* Section 2: Password & Security */}
                <section
                  id="password-security"
                  ref={passwordSecurityRef}
                  className="settings-section"
                >
                  <h2 className="settings-section-title">Password &amp; Security</h2>

                  <div className="settings-card-group">
                    {/* Password Row */}
                    <SwipeableSettingsRow
                      label="Password"
                      value="••••••••••••••••"
                      actionButton={
                        <button
                          type="button"
                          className="settings-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenChangePassword();
                          }}
                        >
                          Edit
                        </button>
                      }
                    />

                    {/* Multi-Factor Authentication (Navigation row, full width) */}
                    <SwipeableSettingsRow
                      label="Multi-Factor Authentication"
                      value={
                        <span className="settings-row-subtext">
                          {googleConnected
                            ? 'Google recovery linked'
                            : 'Extra layer of security.'}
                        </span>
                      }
                      clickable
                      rightArrow
                      onClick={() => setCurrentView('mfa')}
                    />

                    {/* Logged-in Devices (Navigation row, full width) */}
                    <SwipeableSettingsRow
                      label="Logged-in Devices"
                      value={
                        <span className="settings-row-subtext">
                          {totalDevicesCount} active {totalDevicesCount === 1 ? 'session' : 'sessions'}
                        </span>
                      }
                      clickable
                      rightArrow
                      onClick={() => setCurrentView('logged-in-devices')}
                    />
                  </div>
                </section>
              </div>
            </>
          ) : currentView === 'logged-in-devices' ? (
            /* Discord-Style Logged-in Devices View */
            <div className="discord-devices-view">
              {/* Header with Breadcrumb Back Navigation */}
              <header className="discord-devices-header">
                <button
                  type="button"
                  className="discord-devices-back-btn"
                  onClick={() => setCurrentView('main')}
                  aria-label="Back to Account"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span className="breadcrumb-muted">Account</span>
                  <span className="breadcrumb-sep">/</span>
                  <span className="breadcrumb-current">Logged-in Devices</span>
                </button>
                <button
                  type="button"
                  className="settings-close-btn"
                  onClick={handleClose}
                  aria-label="Close settings"
                >
                  <X size={16} weight="bold" />
                </button>
              </header>

              <div className="discord-devices-scroll">
                <div className="discord-devices-intro">
                  <h1 className="discord-devices-title">Logged-in Devices</h1>
                  <p className="discord-devices-subtitle">
                    These are all the devices that are currently logged-in with your account. Log out of devices that you don't recognize.
                  </p>
                </div>

                {/* Section: Current Device */}
                <section className="discord-device-section">
                  <h3 className="discord-device-section-title">Current Device</h3>
                  <div className="discord-device-card current">
                    <div className="discord-device-icon-box">
                      {currentDevice?.deviceType === 'mobile' ? (
                        <DeviceMobileCamera size={22} weight="duotone" />
                      ) : currentDevice?.deviceType === 'tablet' ? (
                        <DeviceTabletSpeaker size={22} weight="duotone" />
                      ) : (
                        <Laptop size={22} weight="duotone" />
                      )}
                    </div>
                    <div className="discord-device-info">
                      <div className="discord-device-platform">
                        <span className="platform-name">
                          {currentDevice?.os || 'Windows'}
                        </span>
                        <span className="platform-dot">•</span>
                        <span className="browser-name">
                          {currentDevice?.browser || 'Chrome'}
                        </span>
                      </div>
                      <div className="discord-device-meta">
                        <span className="device-location">
                          {currentDevice?.location || 'Philippines'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Other Devices */}
                {otherDevices.length > 0 && (
                  <section className="discord-device-section">
                    <h3 className="discord-device-section-title">Other Devices</h3>
                    <div className="discord-device-list">
                      {otherDevices.map((device) => (
                        <div key={device.id} className="discord-device-card">
                          <div className="discord-device-icon-box">
                            {device.deviceType === 'mobile' ? (
                              <DeviceMobileCamera size={22} weight="duotone" />
                            ) : device.deviceType === 'tablet' ? (
                              <DeviceTabletSpeaker size={22} weight="duotone" />
                            ) : (
                              <Laptop size={22} weight="duotone" />
                            )}
                          </div>
                          <div className="discord-device-info">
                            <div className="discord-device-platform">
                              <span className="platform-name">{device.os}</span>
                              <span className="platform-dot">•</span>
                              <span className="browser-name">{device.browser}</span>
                            </div>
                            <div className="discord-device-meta">
                              <span className="device-location">{device.location}</span>
                              <span className="platform-dot">•</span>
                              <span className="device-time">
                                {formatDeviceTime(device.lastActive || device.createdAt)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="discord-device-revoke-btn"
                            onClick={() => handleRevokeDevice(device.id)}
                            title="Log out of this device"
                            aria-label="Log out of this device"
                          >
                            <X size={16} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            /* Discord-Style MFA & Connected Google Account View */
            <div className="discord-mfa-view">
              {/* Header with Breadcrumb Back Navigation */}
              <header className="discord-devices-header">
                <button
                  type="button"
                  className="discord-devices-back-btn"
                  onClick={() => setCurrentView('main')}
                  aria-label="Back to Account"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span className="breadcrumb-muted">Account</span>
                  <span className="breadcrumb-sep">/</span>
                  <span className="breadcrumb-current">Multi-Factor Authentication</span>
                </button>
                <button
                  type="button"
                  className="settings-close-btn"
                  onClick={handleClose}
                  aria-label="Close settings"
                >
                  <X size={16} weight="bold" />
                </button>
              </header>

              <div className="discord-devices-scroll">
                <div className="discord-devices-intro">
                  <h1 className="discord-devices-title">Multi-Factor Authentication</h1>
                  <p className="discord-devices-subtitle">
                    Connect your Google account for emergency identity verification and account retrieval.
                  </p>
                </div>

                {socialFeedback && (
                  <div className="discord-dialog-alert success" role="status" style={{ margin: 0 }}>
                    <Check size={16} weight="bold" />
                    <span>{socialFeedback}</span>
                  </div>
                )}

                {/* Connected Google Account (For Account Retrieval) */}
                <section className="discord-device-section">
                  <h3 className="discord-device-section-title">Connected Google Account</h3>
                  <div className="mfa-provider-list">
                    {/* Google */}
                    <div className="mfa-provider-card">
                      <div className="mfa-provider-icon-box">
                        <svg width="22" height="22" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                      </div>
                      <div className="mfa-provider-info">
                        <div className="mfa-provider-header">
                          <span className="mfa-provider-name">Google</span>
                          <span className={`mfa-provider-status-badge ${googleConnected ? 'connected' : 'disconnected'}`}>
                            {googleConnected ? 'Connected' : 'Not linked'}
                          </span>
                        </div>
                        <span className="mfa-provider-desc">
                          {googleConnected
                            ? `Linked for account recovery: ${googleEmail || `${employee?.employeeId?.toLowerCase() || 'user'}@gmail.com`}`
                            : 'Link your Google account to quickly verify your identity and recover access.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`mfa-connect-btn ${googleConnected ? 'connected-btn' : ''}`}
                        onClick={handleToggleGoogle}
                        disabled={socialLoading === 'google'}
                      >
                        {socialLoading === 'google'
                          ? 'Connecting...'
                          : googleConnected
                          ? 'Disconnect'
                          : 'Connect with Google'}
                      </button>
                    </div>
                  </div>

                  {/* Info Note Tip */}
                  <div className="mfa-info-tip-box">
                    <Info size={22} weight="duotone" className="mfa-info-tip-icon" />
                    <div>
                      <strong>Note on Account Retrieval:</strong> Connecting your Google account links your Google email as a trusted recovery method. If you forget your school password or credentials, you can verify and recover your account via Google.
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Discord-style Update Password Sub-Modal */}
      {changePasswordOpen && (
        <div
          className="discord-password-submodal-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (!isSubmittingPassword) setChangePasswordOpen(false);
          }}
        >
          <div
            className="discord-password-dialog-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="change-password-title"
          >
            <header className="discord-password-dialog-header">
              <div className="discord-password-dialog-title-group">
                <h2 id="change-password-title" className="discord-password-dialog-title">
                  Update your password
                </h2>
                <p className="discord-password-dialog-subtitle">
                  Enter your current password and a new password.
                </p>
              </div>
              <button
                type="button"
                className="discord-password-close-btn"
                onClick={() => !isSubmittingPassword && setChangePasswordOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} weight="bold" />
              </button>
            </header>

            <form onSubmit={handlePasswordSubmit} className="discord-password-dialog-form">
              {passwordError && (
                <div className="discord-dialog-alert error" role="alert">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="discord-dialog-alert success" role="status">
                  <Check size={16} weight="bold" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="discord-dialog-field">
                <label htmlFor="curr-pwd" className="discord-dialog-label">
                  Current Password <span className="req">*</span>
                </label>
                <div className="discord-pwd-input-wrap">
                  <input
                    id="curr-pwd"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="discord-dialog-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="discord-pwd-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="discord-dialog-field">
                <label htmlFor="new-pwd" className="discord-dialog-label">
                  New Password <span className="req">*</span>
                </label>
                <div className="discord-pwd-input-wrap">
                  <input
                    id="new-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    className="discord-dialog-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    className="discord-pwd-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="discord-dialog-field">
                <label htmlFor="confirm-pwd" className="discord-dialog-label">
                  Confirm New Password <span className="req">*</span>
                </label>
                <div className="discord-pwd-input-wrap">
                  <input
                    id="confirm-pwd"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="discord-dialog-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="discord-pwd-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <footer className="discord-password-dialog-footer">
                <button
                  type="button"
                  className="discord-dialog-cancel-btn"
                  onClick={() => setChangePasswordOpen(false)}
                  disabled={isSubmittingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="discord-dialog-done-btn"
                  disabled={
                    isSubmittingPassword ||
                    !currentPassword.trim() ||
                    !newPassword.trim() ||
                    !confirmPassword.trim()
                  }
                >
                  {isSubmittingPassword ? 'Updating...' : 'Done'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
