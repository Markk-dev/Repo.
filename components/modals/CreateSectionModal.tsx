'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  MagnifyingGlass,
  Check,
  FolderSimplePlus,
  ArrowLeft,
} from '@phosphor-icons/react/dist/ssr';

export interface MemberOption {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  program: string;
  avatarBg?: string;
}

const DEFAULT_MEMBERS: MemberOption[] = [
  {
    id: '1',
    employeeId: '26-008-0005',
    name: 'Mark Vincent Madrid',
    position: 'Administrative Assistant',
    program: 'SAHS Department',
    avatarBg: '#00ba58',
  },
  {
    id: '2',
    employeeId: '26-008-0012',
    name: 'Dr. Maria Santos',
    position: 'Program Chair',
    program: 'BS Physical Therapy',
    avatarBg: '#1d4ed8',
  },
  {
    id: '3',
    employeeId: '26-008-0018',
    name: 'Prof. Juan Dela Cruz',
    position: 'Senior Faculty',
    program: 'BS Medical Technology',
    avatarBg: '#b45309',
  },
  {
    id: '4',
    employeeId: '26-008-0024',
    name: 'Ana Reyes, R.N.',
    position: 'Clinical Instructor',
    program: 'BS Nursing',
    avatarBg: '#6b7280',
  },
  {
    id: '5',
    employeeId: '26-008-0030',
    name: 'Dr. Roberto Gomez',
    position: 'Department Instructor',
    program: 'Doctor of Dental Medicine',
    avatarBg: '#dc2626',
  },
];

interface CreateSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSectionCreated?: (section: { name: string; isPrivate: boolean; memberIds: string[] }) => void;
}

export function CreateSectionModal({
  isOpen,
  onClose,
  onSectionCreated,
}: CreateSectionModalProps) {
  const [sectionName, setSectionName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [step, setStep] = useState<'details' | 'members'>('details');
  const [searchMember, setSearchMember] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSectionName('');
      setIsPrivate(false);
      setStep('details');
      setSearchMember('');
      setSelectedMemberIds(['1']); // Current user selected by default
      setIsTyping(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 30); // Strict 30 character limit

    setSectionName(sanitized);
    setIsTyping(sanitized.length > 0);
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const filteredMembers = DEFAULT_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.employeeId.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.position.toLowerCase().includes(searchMember.toLowerCase())
  );

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim()) return;

    if (isPrivate) {
      setStep('members');
    } else {
      executeCreate();
    }
  };

  const executeCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sectionName.trim().toUpperCase(),
          description: isPrivate ? 'Private department section' : '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (onSectionCreated) {
          onSectionCreated({
            name: sectionName.trim().toUpperCase(),
            isPrivate,
            memberIds: selectedMemberIds,
          });
        }
        onClose();
      }
    } catch (err) {
      console.error('Failed to create section:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="discord-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="discord-dialog-box discord-create-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-section-title"
      >
        <button
          type="button"
          className="discord-dialog-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} weight="bold" />
        </button>

        {step === 'details' ? (
          <form onSubmit={handleSubmitDetails}>
            <div className="discord-dialog-header">
              <h3 id="create-section-title" className="discord-dialog-title">
                Create Section
              </h3>
              <p className="discord-dialog-subtitle">
                Sections organize your discussions into distinct categories for your department.
              </p>
            </div>

            <div className="discord-dialog-body">
              {/* Section Name Input */}
              <div className="discord-dialog-field-group">
                <div className="field-label-row">
                  <label htmlFor="section-name-input" className="discord-dialog-label">
                    SECTION NAME
                  </label>
                  {/* Fade in character counter strictly when typing */}
                  <span
                    className={`char-counter-badge ${isTyping ? 'visible' : ''}`}
                    aria-live="polite"
                  >
                    {sectionName.length} / 30
                  </span>
                </div>

                <div className="discord-input-wrapper">
                  <FolderSimplePlus size={18} weight="duotone" className="input-prefix-icon" />
                  <input
                    id="section-name-input"
                    type="text"
                    className="discord-dialog-input with-prefix"
                    value={sectionName}
                    onChange={handleNameChange}
                    onFocus={() => setIsTyping(sectionName.length > 0)}
                    onBlur={() => setIsTyping(false)}
                    placeholder="new-section"
                    maxLength={30}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Private Section Toggle */}
              <div className="discord-toggle-card">
                <div className="toggle-card-left">
                  <div className="toggle-icon-wrap">
                    <Lock size={18} weight="bold" />
                  </div>
                  <div className="toggle-card-text">
                    <span className="toggle-card-title">Private Section</span>
                    <span className="toggle-card-desc">
                      Only selected members will be able to view discussions inside this section.
                    </span>
                  </div>
                </div>

                <label className="discord-switch" aria-label="Toggle private section">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>
            </div>

            <div className="discord-dialog-footer">
              <button
                type="button"
                className="discord-dialog-btn secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="discord-dialog-btn primary"
                disabled={isSubmitting || !sectionName.trim()}
              >
                {isPrivate ? 'Next' : isSubmitting ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Add Members to Private Section */
          <div>
            <div className="discord-dialog-header">
              <h3 className="discord-dialog-title">Add Members to Section</h3>
              <p className="discord-dialog-subtitle">
                Select staff and faculty members who have access to &quot;{sectionName.toUpperCase()}&quot;.
              </p>
            </div>

            <div className="discord-dialog-body">
              {/* Member search */}
              <div className="member-search-input-wrapper">
                <MagnifyingGlass size={16} weight="bold" className="search-icon" />
                <input
                  type="text"
                  className="member-search-input"
                  placeholder="Search members by name or ID..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
              </div>

              {/* Members List */}
              <div className="modal-members-list-scroll">
                {filteredMembers.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className={`modal-member-row ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleMember(member.id)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                    >
                      <div
                        className="member-avatar"
                        style={{ backgroundColor: member.avatarBg || '#00ba58' }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-pos">
                          {member.position} • {member.program}
                        </span>
                      </div>

                      <div className={`member-checkbox ${isChecked ? 'checked' : ''}`}>
                        {isChecked && <Check size={13} weight="bold" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="discord-dialog-footer">
              <button
                type="button"
                className="discord-dialog-btn secondary"
                onClick={() => setStep('details')}
              >
                <ArrowLeft size={16} weight="bold" style={{ marginRight: 4 }} />
                Back
              </button>
              <button
                type="button"
                className="discord-dialog-btn primary"
                disabled={isSubmitting}
                onClick={executeCreate}
              >
                {isSubmitting ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
