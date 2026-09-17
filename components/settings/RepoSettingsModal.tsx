'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  IdentificationCard,
  Key,
  GraduationCap,
  ListChecks,
  X,
  MagnifyingGlass,
  DotsThreeVertical,
  Trash,
  Check,
  ShieldCheck,
  ArrowsDownUp,
  UserCircle,
  Prohibit,
  ArrowsClockwise,
  CheckCircle,
} from '@phosphor-icons/react/dist/ssr';
import { Employee } from '@/context/AuthContext';

export type RepoSettingsTab =
  | 'members'
  | 'register'
  | 'roles'
  | 'privilege'
  | 'programs'
  | 'audit-log';

export interface RepoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: RepoSettingsTab;
  currentEmployee?: Employee | null;
}

export interface MemberRecord {
  id: string;
  employeeId: string;
  name: string;
  username: string;
  position: string;
  program: string;
  dateAdded: string;
  role: 'Admin' | 'Moderator' | 'Regular';
  status: 'Active' | 'Inactive' | 'Deactivated';
  avatarBg?: string;
}

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: '1',
    employeeId: '26-008-0005',
    name: 'Mark Vincent Madrid',
    username: 'mark.devv',
    position: 'Administrative Assistant',
    program: 'SAHS Department',
    dateAdded: '2 months ago',
    role: 'Admin',
    status: 'Active',
    avatarBg: '#00ba58',
  },
  {
    id: '2',
    employeeId: '26-008-0012',
    name: 'Dr. Maria Santos',
    username: 'maria.santos',
    position: 'Program Chair',
    program: 'BS Physical Therapy',
    dateAdded: '1 month ago',
    role: 'Admin',
    status: 'Active',
    avatarBg: '#1d4ed8',
  },
  {
    id: '3',
    employeeId: '26-008-0018',
    name: 'Prof. Juan Dela Cruz',
    username: 'juan.delacruz',
    position: 'Senior Faculty',
    program: 'BS Medical Technology',
    dateAdded: '3 weeks ago',
    role: 'Moderator',
    status: 'Active',
    avatarBg: '#b45309',
  },
  {
    id: '4',
    employeeId: '26-008-0024',
    name: 'Ana Reyes, R.N.',
    username: 'ana.reyes',
    position: 'Clinical Instructor',
    program: 'BS Nursing',
    dateAdded: '5 days ago',
    role: 'Regular',
    status: 'Inactive',
    avatarBg: '#6b7280',
  },
  {
    id: '5',
    employeeId: '26-008-0030',
    name: 'Dr. Roberto Gomez',
    username: 'roberto.gomez',
    position: 'Department Instructor',
    program: 'Doctor of Dental Medicine',
    dateAdded: 'Yesterday',
    role: 'Regular',
    status: 'Deactivated',
    avatarBg: '#dc2626',
  },
];

export function RepoSettingsModal({
  isOpen,
  onClose,
  initialTab = 'members',
  currentEmployee,
}: RepoSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<RepoSettingsTab>(initialTab);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [members, setMembers] = useState<MemberRecord[]>(INITIAL_MEMBERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [programSearchQuery, setProgramSearchQuery] = useState('');

  // Portal dropdown positioning
  const menuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Register Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newProgram, setNewProgram] = useState('SAHS Department');
  const [newRole, setNewRole] = useState<'Admin' | 'Moderator' | 'Regular'>('Regular');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Closing & Drag animation states
  const [isClosing, setIsClosing] = useState(false);
  const [drawerTranslateY, setDrawerTranslateY] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const drawerDragStartY = useRef<number | null>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDrawerTranslateY(0);
    }, 240);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsClosing(false);
      setDrawerTranslateY(0);
      setActiveMenuId(null);
      setIsSortOpen(false);
      setFormSuccess(null);
      setFormError(null);
    }
  }, [isOpen, initialTab]);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  // Outside click listener for row popover & sort dropdown
  useEffect(() => {
    const handleDocClick = () => {
      setActiveMenuId(null);
      setMenuPos(null);
      setIsSortOpen(false);
    };
    if (activeMenuId || isSortOpen) {
      document.addEventListener('click', handleDocClick);
      return () => document.removeEventListener('click', handleDocClick);
    }
  }, [activeMenuId, isSortOpen]);

  // Mobile Drag Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    drawerDragStartY.current = e.touches[0].clientY;
    setIsDraggingDrawer(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (drawerDragStartY.current === null) return;
    const diff = e.touches[0].clientY - drawerDragStartY.current;
    if (diff > 0) {
      setDrawerTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (drawerDragStartY.current === null) return;
    if (drawerTranslateY > 70) {
      handleClose();
    }
    setDrawerTranslateY(0);
    setIsDraggingDrawer(false);
    drawerDragStartY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    drawerDragStartY.current = e.clientY;
    setIsDraggingDrawer(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (drawerDragStartY.current === null) return;
      const diff = moveEvent.clientY - drawerDragStartY.current;
      if (diff > 0) {
        setDrawerTranslateY(diff);
      }
    };

    const handleMouseUp = () => {
      if (drawerDragStartY.current !== null) {
        setDrawerTranslateY((curr) => {
          if (curr > 70) {
            handleClose();
          }
          return 0;
        });
      }
      setIsDraggingDrawer(false);
      drawerDragStartY.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  // Member Actions
  const handleToggleDeactivate = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const nextStatus = m.status === 'Deactivated' ? 'Active' : 'Deactivated';
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
    setActiveMenuId(null);
    setMenuPos(null);
  };

  const handleChangeRole = (memberId: string, role: 'Admin' | 'Moderator' | 'Regular') => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m))
    );
    setActiveMenuId(null);
    setMenuPos(null);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setActiveMenuId(null);
    setMenuPos(null);
  };

  const handleRegisterMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmployeeId.trim() || !newPosition.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const newMember: MemberRecord = {
      id: String(Date.now()),
      name: newFullName.trim(),
      employeeId: newEmployeeId.trim(),
      username: newFullName.toLowerCase().replace(/[^a-z0-9]/g, '.'),
      position: newPosition.trim(),
      program: newProgram,
      dateAdded: 'Just now',
      role: newRole,
      status: 'Active',
      avatarBg: newRole === 'Admin' ? '#1d4ed8' : newRole === 'Moderator' ? '#b45309' : '#00ba58',
    };

    setMembers((prev) => [newMember, ...prev]);
    setFormSuccess(`Successfully registered ${newFullName} to repository!`);
    setFormError(null);
    setNewFullName('');
    setNewEmployeeId('');
    setNewPosition('');

    setTimeout(() => {
      setActiveTab('members');
      setFormSuccess(null);
    }, 1200);
  };

  // Filter members based on table search query
  const filteredMembers = members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      return sortOrder === 'newest' ? numB - numA : numA - numB;
    });

  // Dynamic titles for header
  const getTabTitle = () => {
    switch (activeTab) {
      case 'members':
        return 'Server Members';
      case 'register':
        return 'Register Member';
      case 'roles':
        return 'Role Management';
      case 'privilege':
        return 'Access Privileges';
      case 'programs':
        return 'Programs';
      case 'audit-log':
        return 'Audit Log';
      default:
        return 'Server Settings';
    }
  };

  const navItems = [
    { id: 'members', label: 'Members', icon: Users, group: 'MAIN' },
    { id: 'register', label: 'Register', icon: UserPlus, group: 'MAIN' },
    { id: 'roles', label: 'Roles', icon: IdentificationCard, group: 'MAIN' },
    { id: 'privilege', label: 'Privilege', icon: Key, group: 'MAIN' },
    { id: 'programs', label: 'Programs', icon: GraduationCap, group: 'MAIN' },
    { id: 'audit-log', label: 'Audit Log', icon: ListChecks, group: 'MODERATION' },
  ] as const;

  const filteredNavItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div
      className={`portal-modal-backdrop settings-modal-backdrop ${isClosing ? 'backdrop-closing' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`settings-modal-card repo-modal-card ${isClosing ? 'drawer-closing modal-closing' : ''}`}
        style={{
          transform: drawerTranslateY > 0 ? `translateY(${drawerTranslateY}px)` : undefined,
          transition: isDraggingDrawer ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-settings-dialog-title"
      >
        {/* Mobile Drag Indicator Area */}
        <div
          className="settings-mobile-drag-handle-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
        >
          <div className="settings-mobile-drag-handle" />
        </div>

        {/* 1. Left Sidebar Navigation */}
        <aside className="settings-sidebar repo-clean-sidebar">
          {/* Quick Search Field */}
          <div className="settings-search-box" style={{ marginTop: '4px' }}>
            <MagnifyingGlass size={14} weight="bold" />
            <input
              type="text"
              placeholder="Search settings..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              aria-label="Search settings"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Navigation Tree */}
          <nav className="settings-nav" style={{ gap: '10px' }}>
            {/* MAIN GROUP */}
            <div className="settings-nav-group">
              <div className="repo-sidebar-group-heading">MAIN</div>
              <div className="settings-subnav-items">
                {filteredNavItems
                  .filter((item) => item.group === 'MAIN')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`settings-subnav-btn repo-nav-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id as RepoSettingsTab)}
                        data-label={item.label}
                        aria-label={item.label}
                      >
                        <Icon
                          size={16}
                          weight={isActive ? 'bold' : 'regular'}
                          className="repo-nav-icon"
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* MODERATION GROUP */}
            <div className="settings-nav-group">
              <div className="repo-sidebar-group-heading">MODERATION</div>
              <div className="settings-subnav-items">
                {filteredNavItems
                  .filter((item) => item.group === 'MODERATION')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`settings-subnav-btn repo-nav-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id as RepoSettingsTab)}
                        data-label={item.label}
                        aria-label={item.label}
                      >
                        <Icon
                          size={16}
                          weight={isActive ? 'bold' : 'regular'}
                          className="repo-nav-icon"
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </nav>
        </aside>

        {/* 2. Right Main Content Area */}
        <main className="settings-main">
          {/* Header with Title and Close Button */}
          <header className="settings-header">
            <h1 id="repo-settings-dialog-title" className="settings-title">
              <span className="desktop-title">{getTabTitle()}</span>
              <span className="mobile-title">{getTabTitle()}</span>
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
          <div className="settings-content-scroll repo-content-scroll">
            {/* MEMBERS TAB */}
            {activeTab === 'members' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Manage registered members in your department repository, assign roles, and control access privileges.
                </p>

                {/* Table Card Frame */}
                <div className="discord-table-card">
                  <div className="discord-table-top-bar">
                    <h3 className="discord-table-heading">Recent Members</h3>

                    <div className="discord-table-actions">
                      <div className="discord-search-wrap">
                        <MagnifyingGlass size={14} weight="bold" className="discord-search-icon" />
                        <input
                          type="text"
                          className="discord-search-input"
                          placeholder="Search by name, or Employee ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="discord-search-clear"
                            onClick={() => setSearchQuery('')}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        )}
                      </div>

                      {/* Sort dropdown */}
                      <div className="discord-sort-dropdown-wrap">
                        <button
                          type="button"
                          className={`discord-sort-btn ${isSortOpen ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSortOpen(!isSortOpen);
                          }}
                        >
                          <ArrowsDownUp size={14} weight="bold" />
                          <span>Sort</span>
                        </button>

                        {isSortOpen && (
                          <div
                            className="discord-sort-popover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`discord-sort-option ${sortOrder === 'newest' ? 'selected' : ''}`}
                              onClick={() => {
                                setSortOrder('newest');
                                setIsSortOpen(false);
                              }}
                            >
                              <span>Newest First</span>
                              <div className="discord-radio-circle">
                                {sortOrder === 'newest' && <div className="discord-radio-dot" />}
                              </div>
                            </button>
                            <button
                              type="button"
                              className={`discord-sort-option ${sortOrder === 'oldest' ? 'selected' : ''}`}
                              onClick={() => {
                                setSortOrder('oldest');
                                setIsSortOpen(false);
                              }}
                            >
                              <span>Oldest First</span>
                              <div className="discord-radio-circle">
                                {sortOrder === 'oldest' && <div className="discord-radio-dot" />}
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="discord-table-scroll-wrapper">
                    <table className="discord-members-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Position</th>
                          <th>Date Added</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="repo-empty-table">
                              No members found matching &quot;{searchQuery}&quot;
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member, idx) => {
                            const isNearBottom = idx >= Math.max(0, filteredMembers.length - 2);
                            return (
                            <tr
                              key={member.id}
                              className={member.status === 'Deactivated' ? 'row-deactivated' : ''}
                            >
                              {/* Name Cell */}
                              <td>
                                <div className="discord-user-cell">
                                  <div
                                    className="discord-avatar-circle"
                                    style={{
                                      backgroundColor: member.avatarBg || '#1d4ed8',
                                    }}
                                  >
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="discord-user-meta">
                                    <span className="discord-display-name">{member.name}</span>
                                    <span className="discord-username">{member.employeeId}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Position */}
                              <td>
                                <span className="discord-pos-text">{member.position}</span>
                              </td>

                              {/* Date Added */}
                              <td>
                                <span className="discord-date-text">{member.dateAdded}</span>
                              </td>

                              {/* Role */}
                              <td>
                                <span className={`discord-role-pill role-${member.role.toLowerCase()}`}>
                                  {member.role}
                                </span>
                              </td>

                              {/* Status */}
                              <td>
                                <span className={`discord-status-text status-${member.status.toLowerCase()}`}>
                                  {member.status}
                                </span>
                              </td>

                              {/* Actions Menu */}
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="discord-action-trigger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeMenuId === member.id) {
                                      setActiveMenuId(null);
                                      setMenuPos(null);
                                    } else {
                                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                      setMenuPos({
                                        top: isNearBottom
                                          ? rect.top + window.scrollY - 8
                                          : rect.bottom + window.scrollY + 6,
                                        right: window.innerWidth - rect.right,
                                      });
                                      setActiveMenuId(member.id);
                                    }
                                  }}
                                  aria-label="Member options"
                                >
                                  <DotsThreeVertical size={16} weight="bold" />
                                </button>
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="discord-table-footer">
                    <span>Showing {filteredMembers.length} members</span>
                  </div>
                </div>

                {/* Row action dropdown — rendered via portal outside the table */}
                {activeMenuId && menuPos && typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      className="discord-row-menu-popover portal"
                      style={{
                        position: 'fixed',
                        top: menuPos.top,
                        right: menuPos.right,
                        zIndex: 9999,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const member = members.find((m) => m.id === activeMenuId);
                        if (!member) return null;
                        return (
                          <>
                            <div className="discord-menu-header-label">Role</div>
                            <button
                              type="button"
                              className={`discord-menu-item ${member.role === 'Admin' ? 'active' : ''}`}
                              onClick={() => handleChangeRole(member.id, 'Admin')}
                            >
                              <ShieldCheck size={14} />
                              <span>Admin</span>
                              {member.role === 'Admin' && <Check size={12} weight="bold" />}
                            </button>
                            <button
                              type="button"
                              className={`discord-menu-item ${member.role === 'Moderator' ? 'active' : ''}`}
                              onClick={() => handleChangeRole(member.id, 'Moderator')}
                            >
                              <UserCircle size={14} />
                              <span>Moderator</span>
                              {member.role === 'Moderator' && <Check size={12} weight="bold" />}
                            </button>
                            <button
                              type="button"
                              className={`discord-menu-item ${member.role === 'Regular' ? 'active' : ''}`}
                              onClick={() => handleChangeRole(member.id, 'Regular')}
                            >
                              <Users size={14} />
                              <span>Regular</span>
                              {member.role === 'Regular' && <Check size={12} weight="bold" />}
                            </button>

                            <div className="discord-menu-divider" />

                            <button
                              type="button"
                              className="discord-menu-item"
                              onClick={() => handleToggleDeactivate(member.id)}
                            >
                              {member.status === 'Deactivated' ? (
                                <>
                                  <ArrowsClockwise size={14} />
                                  <span>Reactivate</span>
                                </>
                              ) : (
                                <>
                                  <Prohibit size={14} />
                                  <span>Deactivate</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="discord-menu-item danger"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash size={14} />
                              <span>Remove Member</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>,
                    document.body
                  )
                }
              </div>
            )}

            {/* REGISTER TAB */}
            {activeTab === 'register' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Add faculty and staff members to the SAHS department repository.
                </p>

                <form onSubmit={handleRegisterMember} className="repo-register-form">
                  {formSuccess && (
                    <div className="repo-form-alert success">
                      <CheckCircle size={18} weight="fill" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {formError && (
                    <div className="repo-form-alert error">
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="repo-form-grid">
                    <div className="repo-field-group">
                      <label className="repo-label">
                        Full Name <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="repo-form-input"
                        placeholder="e.g. Dr. Maria Santos"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>

                    <div className="repo-field-group">
                      <label className="repo-label">
                        Employee ID <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="repo-form-input"
                        placeholder="e.g. 26-008-0042"
                        value={newEmployeeId}
                        onChange={(e) => setNewEmployeeId(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>

                    <div className="repo-field-group">
                      <label className="repo-label">
                        Position / Title <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="repo-form-input"
                        placeholder="e.g. Clinical Instructor"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>

                    <div className="repo-field-group">
                      <label className="repo-label">Program / Department</label>
                      <select
                        className="repo-form-select"
                        value={newProgram}
                        onChange={(e) => setNewProgram(e.target.value)}
                      >
                        <option value="SAHS Department">SAHS Department</option>
                        <option value="BS Nursing">BS Nursing</option>
                        <option value="BS Physical Therapy">BS Physical Therapy</option>
                        <option value="BS Medical Technology">BS Medical Technology</option>
                        <option value="BS Pharmacy">BS Pharmacy</option>
                        <option value="Doctor of Dental Medicine">Doctor of Dental Medicine</option>
                      </select>
                    </div>

                    <div className="repo-field-group">
                      <label className="repo-label">Repository Role</label>
                      <select
                        className="repo-form-select"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'Admin' | 'Moderator' | 'Regular')}
                      >
                        <option value="Regular">Regular Member</option>
                        <option value="Moderator">Moderator</option>
                        <option value="Admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="repo-submit-btn">
                      Register Member
                    </button>
                    <button
                      type="button"
                      className="repo-cancel-btn"
                      onClick={() => setActiveTab('members')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ROLES TAB */}
            {activeTab === 'roles' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Overview of repository permission levels across administrators, moderators, and regular members.
                </p>

                <div className="repo-roles-grid">
                  <div className="repo-role-card">
                    <div className="repo-role-card-header">
                      <ShieldCheck size={26} weight="fill" className="role-icon super" />
                      <div>
                        <h4 className="role-card-title">Administrator</h4>
                        <span className="role-card-subtitle">Full Repository Control</span>
                      </div>
                    </div>
                    <ul className="role-perm-list">
                      <li>
                        <Check size={14} weight="bold" /> Manage registered members &amp; roles
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> Create, edit &amp; publish official events
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> View full moderation audit logs
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> Department settings &amp; configurations
                      </li>
                    </ul>
                  </div>

                  <div className="repo-role-card">
                    <div className="repo-role-card-header">
                      <UserCircle size={26} weight="fill" className="role-icon admin" />
                      <div>
                        <h4 className="role-card-title">Moderator</h4>
                        <span className="role-card-subtitle">Department Coordinator</span>
                      </div>
                    </div>
                    <ul className="role-perm-list">
                      <li>
                        <Check size={14} weight="bold" /> Create &amp; update department events
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> Moderate participant attendance lists
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> View repository members
                      </li>
                    </ul>
                  </div>

                  <div className="repo-role-card">
                    <div className="repo-role-card-header">
                      <Users size={26} weight="fill" className="role-icon faculty" />
                      <div>
                        <h4 className="role-card-title">Regular Member</h4>
                        <span className="role-card-subtitle">Faculty &amp; Staff</span>
                      </div>
                    </div>
                    <ul className="role-perm-list">
                      <li>
                        <Check size={14} weight="bold" /> View department calendar &amp; schedules
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> RSVP &amp; attend department activities
                      </li>
                      <li>
                        <Check size={14} weight="bold" /> Access shared repository announcements
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVILEGE TAB */}
            {activeTab === 'privilege' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Department repository access policies and security overrides.
                </p>

                <div className="repo-privilege-box">
                  <div className="privilege-header-banner">
                    <Key size={18} weight="bold" />
                    <span>Active Privilege Policies</span>
                  </div>
                  <div className="privilege-rules-list">
                    <div className="privilege-rule-item">
                      <span className="rule-badge sahs">SAHS Isolation</span>
                      <span className="rule-desc">
                        Only verified employees assigned to the School of Allied Health Sciences can access this repository.
                      </span>
                    </div>
                    <div className="privilege-rule-item">
                      <span className="rule-badge program">Program Scoping</span>
                      <span className="rule-desc">
                        Program Chairs can coordinate and publish events for their specific academic degrees (Nursing, PT, MedTech, etc.).
                      </span>
                    </div>
                    <div className="privilege-rule-item">
                      <span className="rule-badge admin">Audit Logging</span>
                      <span className="rule-desc">
                        All member registrations, role modifications, and event creations are immutably logged for administrative compliance.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROGRAMS TAB */}
            {activeTab === 'programs' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Manage academic programs, departments, and curricula in your repository.
                </p>

                {/* Table Card Frame */}
                <div className="discord-table-card">
                  <div className="discord-table-top-bar">
                    <h3 className="discord-table-heading">Programs</h3>

                    <div className="discord-table-actions">
                      <div className="discord-search-wrap">
                        <MagnifyingGlass size={14} weight="bold" className="discord-search-icon" />
                        <input
                          type="text"
                          className="discord-search-input"
                          placeholder="Search programs..."
                          value={programSearchQuery}
                          onChange={(e) => setProgramSearchQuery(e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        {programSearchQuery && (
                          <button
                            type="button"
                            className="discord-search-clear"
                            onClick={() => setProgramSearchQuery('')}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Programs Table */}
                  <div className="discord-table-scroll-wrapper" style={{ minHeight: '220px' }}>
                    <table className="discord-members-table">
                      <thead>
                        <tr>
                          <th>Program Name</th>
                          <th>Code</th>
                          <th>Faculty Members</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: '1', name: 'BS Nursing', code: 'BSN', count: '18 Faculty', status: 'Active' },
                          { id: '2', name: 'BS Physical Therapy', code: 'BSPT', count: '12 Faculty', status: 'Active' },
                          { id: '3', name: 'BS Medical Technology', code: 'BSMT', count: '15 Faculty', status: 'Active' },
                          { id: '4', name: 'BS Pharmacy', code: 'BSPHARM', count: '10 Faculty', status: 'Active' },
                          { id: '5', name: 'Doctor of Dental Medicine', code: 'DMD', count: '14 Faculty', status: 'Active' },
                          { id: '6', name: 'General Allied Health', code: 'SAHS-GEN', count: '6 Faculty', status: 'Active' },
                        ]
                          .filter((p) =>
                            p.name.toLowerCase().includes(programSearchQuery.toLowerCase()) ||
                            p.code.toLowerCase().includes(programSearchQuery.toLowerCase())
                          )
                          .map((prog) => (
                            <tr key={prog.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <GraduationCap size={16} weight="duotone" style={{ color: '#00ba58' }} />
                                  <span className="discord-display-name">{prog.name}</span>
                                </div>
                              </td>
                              <td>
                                <span className="discord-username">{prog.code}</span>
                              </td>
                              <td>
                                <span className="discord-pos-text">{prog.count}</span>
                              </td>
                              <td>
                                <span className="discord-status-text status-active">{prog.status}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT LOG TAB */}
            {activeTab === 'audit-log' && (
              <div className="discord-members-container">
                <p className="discord-members-subtitle" style={{ marginBottom: '18px' }}>
                  Track repository member actions, role changes, and access events.
                </p>

                <div className="repo-audit-timeline">
                  <div className="audit-log-card">
                    <div className="audit-log-icon-wrap">
                      <ShieldCheck size={18} weight="bold" />
                    </div>
                    <div className="audit-log-details">
                      <div className="audit-log-user-line">
                        <span className="audit-user">Mark Vincent Madrid</span>
                        <span className="audit-action">updated role of Dr. Maria Santos to Admin</span>
                      </div>
                      <span className="audit-time">Today at 10:24 AM</span>
                    </div>
                  </div>

                  <div className="audit-log-card">
                    <div className="audit-log-icon-wrap">
                      <UserPlus size={18} weight="bold" />
                    </div>
                    <div className="audit-log-details">
                      <div className="audit-log-user-line">
                        <span className="audit-user">Dr. Maria Santos</span>
                        <span className="audit-action">registered Ana Reyes, R.N. to repository</span>
                      </div>
                      <span className="audit-time">5 days ago</span>
                    </div>
                  </div>

                  <div className="audit-log-card">
                    <div className="audit-log-icon-wrap">
                      <Prohibit size={18} weight="bold" />
                    </div>
                    <div className="audit-log-details">
                      <div className="audit-log-user-line">
                        <span className="audit-user">System Security</span>
                        <span className="audit-action">deactivated inactive account for Dr. Roberto Gomez</span>
                      </div>
                      <span className="audit-time">Yesterday at 6:15 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
