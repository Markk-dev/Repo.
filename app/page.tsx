'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
  DotsThree,
  FolderSimplePlus,
  GearSix,
  Hash,
  Lock,
  MagnifyingGlass,
  MegaphoneSimple,
  Plus,
  PushPin,
  ShieldCheck,
  SignOut,
  Trash,
  Users,
} from '@phosphor-icons/react/dist/ssr';
import { UserSettingsModal } from '@/components/settings/UserSettingsModal';
import { RepoSettingsModal, RepoSettingsTab } from '@/components/settings/RepoSettingsModal';
import { PopoverMenu } from '@/components/ui/PopoverMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { CalendarView } from '@/components/events/CalendarView';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { DiscussionChatView } from '@/components/chat/DiscussionChatView';
import { CreateSectionModal } from '@/components/modals/CreateSectionModal';
import { CreateDiscussionModal } from '@/components/modals/CreateDiscussionModal';
import { DeleteDiscussionModal } from '@/components/modals/DeleteDiscussionModal';
import { MobileFeatureBlockDrawer } from '@/components/ui/MobileFeatureBlockDrawer';
import { Toast, ToastType } from '@/components/ui/Toast';
import { getDiscussionIcon } from '@/components/icons/DiscussionIcons';

export default function DashboardPage() {
  const { employee, logout, isLoading, sessionOverridden, isVerified } = useAuth();
  const router = useRouter();
  const [activeRail, setActiveRail] = useState('dept-sahs');
  const [activeNavigation, setActiveNavigation] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [repoSettingsOpen, setRepoSettingsOpen] = useState(false);
  const [repoSettingsTab, setRepoSettingsTab] = useState<RepoSettingsTab>('members');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [mobileBlockDrawerOpen, setMobileBlockDrawerOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [createDiscussionOpen, setCreateDiscussionOpen] = useState(false);
  const [deleteDiscussionTarget, setDeleteDiscussionTarget] = useState<{
    id: string;
    name: string;
    isPrivate?: boolean;
  } | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activeSectionMenuId, setActiveSectionMenuId] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [announcementDiscussionId, setAnnouncementDiscussionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: ToastType } | null>(null);
  const [selectedSectionForDiscussion, setSelectedSectionForDiscussion] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const userMenuRef = useRef<HTMLDivElement>(null);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !employee && !sessionOverridden) {
      router.push('/login');
    }
  }, [employee, isLoading, router, sessionOverridden]);

  // Load Announcement Discussion & Sections
  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        const data = await res.json();
        const secList = data.sections || [];
        setSections(secList);
      }
    } catch (e) {
      console.warn('Failed to fetch sections:', e);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const loadAnnouncementDiscussion = useCallback(async () => {
    try {
      const res = await fetch('/api/discussions/announcement');
      if (res.ok) {
        const data = await res.json();
        if (data.discussion?.id) {
          setAnnouncementDiscussionId(data.discussion.id);
          return data.discussion.id;
        }
      }
    } catch (err) {
      console.warn('Failed to load announcement discussion:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    loadAnnouncementDiscussion();
  }, [loadAnnouncementDiscussion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsModalOpen) setSettingsModalOpen(false);
        if (logoutModalOpen) setLogoutModalOpen(false);
        if (userMenuOpen) setUserMenuOpen(false);
        if (serverMenuOpen) setServerMenuOpen(false);
        if (createSectionOpen) setCreateSectionOpen(false);
        if (createDiscussionOpen) setCreateDiscussionOpen(false);
        if (deleteDiscussionTarget) setDeleteDiscussionTarget(null);
        if (deleteSectionTarget) setDeleteSectionTarget(null);
        if (activeSectionMenuId) setActiveSectionMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createDiscussionOpen, createSectionOpen, deleteDiscussionTarget, deleteSectionTarget, logoutModalOpen, serverMenuOpen, settingsModalOpen, userMenuOpen, activeSectionMenuId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target as Node)) {
        setServerMenuOpen(false);
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

  // Admin Check
  const isAdmin =
    employee?.role === 'Admin' ||
    employee?.position === 'Administrative Assistant' ||
    employee?.employeeId === '26-008-0005';

  // Responsive mobile check
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleOptimisticDeleteDiscussion = async (target: { id: string; name: string }) => {
    if (target.name?.toLowerCase() === 'announcements') {
      setToast({
        message: 'The primary announcement channel cannot be deleted.',
        type: 'error',
      });
      return;
    }

    const previousSections = sections;
    const previousNavigation = activeNavigation;

    setDeleteDiscussionTarget(null);
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        discussions: (sec.discussions || []).filter((d: any) => d.id !== target.id),
      }))
    );

    if (activeNavigation === target.id || target.id === announcementDiscussionId) {
      setActiveNavigation('Announcement');
      loadAnnouncementDiscussion();
    }

    try {
      const res = await fetch(`/api/discussions?id=${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete discussion');
      }

      setToast({
        message: `Discussion "#${target.name}" deleted successfully.`,
        type: 'delete',
      });
    } catch (err: any) {
      console.error('Optimistic delete failed:', err);
      setSections(previousSections);
      if (previousNavigation === target.id) {
        setActiveNavigation(previousNavigation);
      }
      setToast({
        message: `Failed to delete #${target.name}. Please try again.`,
        type: 'error',
      });
    }
  };

  const handleDeleteSection = async (target: { id: string; name: string }) => {
    const previousSections = sections;
    const previousNavigation = activeNavigation;

    setDeleteSectionTarget(null);
    setSections((prev) => prev.filter((sec) => sec.id !== target.id));

    const deletedSection = sections.find((s) => s.id === target.id);
    const childDiscIds = (deletedSection?.discussions || []).map((d: any) => d.id);
    if (activeNavigation && childDiscIds.includes(activeNavigation)) {
      setActiveNavigation('Announcement');
    }

    try {
      const res = await fetch(`/api/sections?id=${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete section');
      }

      setToast({
        message: `Section "${target.name}" deleted successfully.`,
        type: 'delete',
      });
    } catch (err: any) {
      console.error('Optimistic delete section failed:', err);
      setSections(previousSections);
      setActiveNavigation(previousNavigation);
      setToast({
        message: `Failed to delete section "${target.name}". Please try again.`,
        type: 'error',
      });
    }
  };

  // Determine active channel / discussion details
  const allDiscussions = sections.flatMap((sec) => sec.discussions || []);
  const isAnnouncement = activeNavigation === 'Announcement' || activeNavigation === null;
  const currentDiscussion = isAnnouncement ? null : allDiscussions.find((d: any) => d.id === activeNavigation);
  const activeDiscussionId = isAnnouncement ? (announcementDiscussionId || 'announcements') : currentDiscussion?.id || null;
  const currentChannelName = isAnnouncement ? 'announcements' : (currentDiscussion?.name || 'general');
  const currentChannelTopic = isAnnouncement ? 'General announcements and updates' : (currentDiscussion?.topic || '');

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
        {/* Navigation Container (Rail + Sidebar) */}
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
            {/* Top Header of Sidebar */}
            <div className="sidebar-topbar" ref={serverMenuRef}>
              <button
                type="button"
                className={`sidebar-server-header-btn ${serverMenuOpen ? 'active' : ''}`}
                onClick={() => setServerMenuOpen(!serverMenuOpen)}
                aria-label="Server options"
                aria-expanded={serverMenuOpen}
                aria-haspopup="menu"
              >
                <span className="sidebar-server-title">SAHS Department</span>
                <CaretDown size={14} weight="bold" className={`sidebar-server-caret ${serverMenuOpen ? 'open' : ''}`} />
              </button>

              <PopoverMenu
                isOpen={serverMenuOpen}
                onClose={() => setServerMenuOpen(false)}
                anchorRef={serverMenuRef}
                position="bottom"
                align="left"
                className="sidebar-server-popover"
                items={[
                  {
                    id: 'create-section',
                    label: 'Create Section',
                    icon: <FolderSimplePlus size={17} weight="regular" />,
                    onClick: () => {
                      setServerMenuOpen(false);
                      setCreateSectionOpen(true);
                    },
                  },
                  {
                    id: 'create-discussion',
                    label: 'Create Discussion',
                    icon: <ChatCircleDots size={17} weight="regular" />,
                    onClick: () => {
                      setServerMenuOpen(false);
                      setSelectedSectionForDiscussion(null);
                      setCreateDiscussionOpen(true);
                    },
                  },
                  { id: 'divider-1', label: '', divider: true },
                  {
                    id: 'members',
                    label: 'Members',
                    icon: <Users size={17} weight="regular" />,
                    onClick: () => {
                      setRepoSettingsTab('members');
                      setRepoSettingsOpen(true);
                      setServerMenuOpen(false);
                    },
                  },
                  {
                    id: 'repo-settings',
                    label: isMobile ? 'Repo Settings — Desktop Only' : 'Repo Settings',
                    icon: isMobile
                      ? <Lock size={17} weight="regular" />
                      : <GearSix size={17} weight="regular" />,
                    mobileDisabled: isMobile,
                    onClick: () => {
                      setServerMenuOpen(false);
                      if (isMobile) {
                        setMobileBlockDrawerOpen(true);
                        return;
                      }
                      setRepoSettingsTab('members');
                      setRepoSettingsOpen(true);
                    },
                  },
                ]}
              />
            </div>

            {/* Scrollable Channels & Sections */}
            <div className="sidebar-channels-scroll">
              <button
                type="button"
                className={`sidebar-channel-item ${activeNavigation === 'Announcement' || activeNavigation === null ? 'active' : ''}`}
                onClick={() => {
                  handleNavSelect('Announcement');
                  if (!announcementDiscussionId) {
                    loadAnnouncementDiscussion();
                  }
                }}
                aria-label="Announcement Channel"
              >
                <MegaphoneSimple size={17} weight="regular" className="sidebar-channel-icon" />
                <span className="sidebar-channel-label">Announcement</span>
              </button>

              <button
                type="button"
                className={`sidebar-channel-item ${activeNavigation === 'Events' ? 'active' : ''}`}
                onClick={() => handleNavSelect('Events')}
                aria-label="Events Calendar"
              >
                <CalendarBlank size={17} weight="regular" className="sidebar-channel-icon" />
                <span className="sidebar-channel-label">Events</span>
              </button>

              <div className="sidebar-channels-divider" />

              {/* Sections & Discussions */}
              {sections.map((section) => {
                const isCollapsed = !!collapsedSections[section.id];
                const sectionDiscussions = (section.discussions || []).filter(
                  (d: any) => !d.is_announcement && d.name?.toLowerCase() !== 'announcements'
                );

                return (
                  <div key={section.id} className="sidebar-section-group">
                    <div className="sidebar-section-header">
                      <button
                        type="button"
                        className={`sidebar-section-toggle-btn ${!isCollapsed ? 'expanded' : ''}`}
                        onClick={() => toggleSection(section.id)}
                        aria-label={`Toggle ${section.name} section`}
                      >
                        <span className="sidebar-section-title">{section.name}</span>
                        {isCollapsed ? (
                          <CaretRight size={12} weight="bold" className="section-caret" />
                        ) : (
                          <CaretDown size={12} weight="bold" className="section-caret" />
                        )}
                      </button>

                      {isAdmin && (
                        <div className="sidebar-section-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`sidebar-section-menu-btn ${activeSectionMenuId === section.id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSectionMenuId(activeSectionMenuId === section.id ? null : section.id);
                            }}
                            aria-label={`Options for ${section.name}`}
                          >
                            <DotsThree size={18} weight="bold" />
                          </button>

                          <PopoverMenu
                            isOpen={activeSectionMenuId === section.id}
                            onClose={() => setActiveSectionMenuId(null)}
                            position="bottom"
                            align="right"
                            items={[
                              {
                                id: `create-discussion-${section.id}`,
                                label: 'Create Discussion',
                                icon: <Plus size={16} weight="bold" />,
                                onClick: () => {
                                  setActiveSectionMenuId(null);
                                  setSelectedSectionForDiscussion(section.id);
                                  setCreateDiscussionOpen(true);
                                },
                              },
                              { id: `divider-${section.id}`, label: '', divider: true },
                              {
                                id: `delete-section-${section.id}`,
                                label: 'Delete Section',
                                icon: <Trash size={16} weight="regular" />,
                                danger: true,
                                onClick: () => {
                                  setActiveSectionMenuId(null);
                                  setDeleteSectionTarget({
                                    id: section.id,
                                    name: section.name,
                                  });
                                },
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="sidebar-section-discussions">
                        {sectionDiscussions.map((disc: any) => {
                          const isSelected = activeNavigation === disc.id;
                          const DiscIcon = getDiscussionIcon(disc.icon, disc.is_announcement);

                          return (
                            <button
                              key={disc.id}
                              type="button"
                              className={`sidebar-channel-item ${isSelected ? 'active' : ''}`}
                              onClick={() => handleNavSelect(disc.id)}
                              aria-label={`${disc.name} discussion`}
                            >
                              {disc.topic?.includes('Private') ? (
                                <Lock size={15} weight="regular" className="sidebar-channel-icon" />
                              ) : (
                                <DiscIcon size={16} weight={disc.icon === 'hash' || !disc.icon ? 'bold' : 'regular'} className="sidebar-channel-icon" />
                              )}
                              <span className="sidebar-channel-label">{disc.name}</span>

                              {isSelected && (
                                <Tooltip content="Discussion Settings" position="top" align="right" className="sidebar-channel-settings-tooltip">
                                  <span
                                    role="button"
                                    className="sidebar-channel-settings-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteDiscussionTarget({
                                        id: disc.id,
                                        name: disc.name,
                                        isPrivate: disc.topic?.includes('Private') || false,
                                      });
                                    }}
                                    aria-label={`Settings for ${disc.name}`}
                                    title="Discussion Settings"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        setDeleteDiscussionTarget({
                                          id: disc.id,
                                          name: disc.name,
                                          isPrivate: disc.topic?.includes('Private') || false,
                                        });
                                      }
                                    }}
                                  >
                                    <GearSix size={14} weight="bold" />
                                  </span>
                                </Tooltip>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Discord-style Floating Bottom User Profile Bar (Spanning across rail and sidebar) */}
          <div className="discord-user-bar-container" ref={userMenuRef}>
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
          {activeNavigation === 'Events' ? (
            <CalendarView
              userName={employee?.name || 'Mark Vincent Madrid'}
              onBack={() => setMobileNavOpen(true)}
            />
          ) : (
            <>
              {/* Top Header */}
              <header className="discord-topbar">
                <div className="topbar-left">
                  <button
                    type="button"
                    className="mobile-back-btn"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Back to channels"
                    title="Channels"
                  >
                    <CaretLeft size={20} weight="bold" />
                  </button>

                  <div className="topbar-channel-info">
                    {(() => {
                      const TopbarIcon = getDiscussionIcon(currentDiscussion?.icon, isAnnouncement);
                      return (
                        <TopbarIcon
                          size={18}
                          weight={isAnnouncement ? 'duotone' : (!currentDiscussion?.icon || currentDiscussion?.icon === 'hash' ? 'bold' : 'regular')}
                          className="topbar-channel-icon"
                        />
                      );
                    })()}
                    <h1 className="topbar-channel-title">
                      {isAnnouncement ? 'announcements' : currentChannelName}
                    </h1>
                    {currentChannelTopic && (
                      <>
                        <div className="topbar-channel-divider" />
                        <span className="topbar-channel-topic">{currentChannelTopic}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="topbar-right">
                  <div className="topbar-search">
                    <MagnifyingGlass size={15} weight="bold" style={{ color: '#8C817B' }} />
                    <input type="text" placeholder="Search messages..." aria-label="Search messages" autoComplete="off" spellCheck={false} />
                  </div>

                  <button className="user-action-btn mobile-search-btn" title="Search" aria-label="Search">
                    <MagnifyingGlass size={18} weight="bold" />
                  </button>

                  <button className="user-action-btn" title="Pinned Documents" aria-label="Pins">
                    <PushPin size={18} weight="regular" />
                  </button>
                </div>
              </header>

              {/* Discussion / Announcement Message Stream & Composition */}
              <DiscussionChatView
                key={activeDiscussionId || 'announcements'}
                discussionId={activeDiscussionId}
                channelName={isAnnouncement ? 'announcements' : currentChannelName}
                channelTopic={currentChannelTopic}
                channelIcon={currentDiscussion?.icon}
                isAnnouncement={isAnnouncement}
                currentEmployee={employee}
                onDiscussionResolved={(resolvedId) => {
                  if (isAnnouncement && resolvedId !== announcementDiscussionId) {
                    setAnnouncementDiscussionId(resolvedId);
                  }
                }}
                onRefreshAnnouncement={loadAnnouncementDiscussion}
              />
            </>
          )}
        </main>
      </div>

      {/* 4. Discord User Settings Modal */}
      <UserSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        employee={employee}
      />

      {/* 5. Repo Settings & Members Modal */}
      {repoSettingsOpen && isMobile ? (
        <>
          {(() => {
            setTimeout(() => {
              setRepoSettingsOpen(false);
              setMobileBlockDrawerOpen(true);
            }, 0);
            return null;
          })()}
        </>
      ) : (
        <RepoSettingsModal
          isOpen={repoSettingsOpen}
          onClose={() => setRepoSettingsOpen(false)}
          initialTab={repoSettingsTab}
          currentEmployee={employee}
        />
      )}

      {/* 6. Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Log Out"
        description="Are you sure you want to logout?"
        confirmText="Log Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={logout}
      />

      {/* 7. Mobile Feature Block Drawer */}
      <MobileFeatureBlockDrawer
        isOpen={mobileBlockDrawerOpen}
        onClose={() => setMobileBlockDrawerOpen(false)}
        featureName="Repo Settings"
      />

      {/* 8. Create Section Modal */}
      <CreateSectionModal
        isOpen={createSectionOpen}
        onClose={() => setCreateSectionOpen(false)}
        onSectionCreated={() => fetchSections()}
      />

      {/* 9. Create Discussion Modal */}
      <CreateDiscussionModal
        isOpen={createDiscussionOpen}
        onClose={() => setCreateDiscussionOpen(false)}
        sections={sections}
        preselectedSectionId={selectedSectionForDiscussion}
        onDiscussionCreated={() => fetchSections()}
      />

      {/* 10. Delete Target Modal (Discussion or Section) */}
      <DeleteDiscussionModal
        isOpen={!!deleteDiscussionTarget || !!deleteSectionTarget}
        onClose={() => {
          setDeleteDiscussionTarget(null);
          setDeleteSectionTarget(null);
        }}
        targetId={deleteSectionTarget ? deleteSectionTarget.id : deleteDiscussionTarget?.id || null}
        targetName={deleteSectionTarget ? deleteSectionTarget.name : deleteDiscussionTarget?.name || ''}
        targetType={deleteSectionTarget ? 'section' : 'discussion'}
        isPrivate={deleteDiscussionTarget?.isPrivate}
        onConfirmDelete={(target) => {
          if (deleteSectionTarget) {
            handleDeleteSection(target);
          } else if (deleteDiscussionTarget) {
            handleOptimisticDeleteDiscussion(target);
          }
        }}
      />

      {/* 11. Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
