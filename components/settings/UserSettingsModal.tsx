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
} from '@phosphor-icons/react/dist/ssr';
import { Employee } from '@/context/AuthContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

type SectionKey = 'account-info' | 'password-security';
type ViewKey = 'main' | 'logged-in-devices';

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

  // Reset view on open/close
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDrawerTranslateY(0);
      fetchDevices();
    } else {
      setCurrentView('main');
      setAvatarMenuOpen(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (changePasswordOpen) {
          setChangePasswordOpen(false);
        } else if (currentView === 'logged-in-devices') {
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

  // Mobile drawer drag gesture state with PointerCapture for instant responsiveness
  const [drawerTranslateY, setDrawerTranslateY] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const drawerDragStartY = useRef<number | null>(null);

  const handleDrawerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawerDragStartY.current = e.clientY;
    setIsDraggingDrawer(true);
  };

  const handleDrawerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawerDragStartY.current === null) return;
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
              <span className="settings-user-name">
                {employee?.name || 'Mark Vincent Madrid'}
              </span>
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
              <header
                className="settings-header"
                onPointerDown={handleDrawerPointerDown}
                onPointerMove={handleDrawerPointerMove}
                onPointerUp={handleDrawerPointerUp}
                onPointerCancel={handleDrawerPointerUp}
              >
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
                          Extra layer of security.
                        </span>
                      }
                      clickable
                      rightArrow
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
          ) : (
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
                  onClick={onClose}
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
