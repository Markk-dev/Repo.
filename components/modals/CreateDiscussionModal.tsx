'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smiley,
  FolderSimple,
  CaretDown,
  Check,
} from '@phosphor-icons/react/dist/ssr';
import {
  DISCUSSION_ICON_OPTIONS,
  getDiscussionIcon,
} from '@/components/icons/DiscussionIcons';

export interface SectionOption {
  id: string;
  name: string;
}

interface CreateDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections?: SectionOption[];
  preselectedSectionId?: string | null;
  onDiscussionCreated?: (discussion: {
    id?: string;
    sectionId: string;
    name: string;
    icon?: string;
    isPrivate?: boolean;
    isRepository?: boolean;
  }) => void;
}

export function CreateDiscussionModal({
  isOpen,
  onClose,
  sections = [],
  preselectedSectionId = null,
  onDiscussionCreated,
}: CreateDiscussionModalProps) {
  const [discussionName, setDiscussionName] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedIconId, setSelectedIconId] = useState<string>('hash');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [isRepository, setIsRepository] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasError, setHasError] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const sectionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDiscussionName('');
      setSelectedIconId('hash');
      setIsIconPickerOpen(false);
      setIsSectionDropdownOpen(false);
      setIsRepository(false);
      setIsTyping(false);
      setHasError(false);

      if (preselectedSectionId) {
        setSelectedSectionId(preselectedSectionId);
      } else if (sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      }
    }
  }, [isOpen, preselectedSectionId, sections]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setIsIconPickerOpen(false);
      }
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setIsSectionDropdownOpen(false);
      }
    };
    if (isIconPickerOpen || isSectionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIconPickerOpen, isSectionDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isIconPickerOpen) {
          setIsIconPickerOpen(false);
        } else if (isSectionDropdownOpen) {
          setIsSectionDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIconPickerOpen, isSectionDropdownOpen, isOpen, onClose]);

  if (!isOpen) return null;

  // Sanitize discussion/repository name format (lowercase, replace spaces with hyphens, cap at 30 chars)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 30); // Strict 30 character limit

    setDiscussionName(sanitized);
    setIsTyping(sanitized.length > 0);
    if (hasError) setHasError(false);
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionName.trim()) {
      setHasError(true);
      document.getElementById('discussion-name-input')?.focus();
      return;
    }
    if (!selectedSectionId) return;
    setHasError(false);
    executeCreate();
  };

  const executeCreate = async () => {
    if (!selectedSectionId || !discussionName.trim()) return;

    setIsSubmitting(true);
    const finalIcon = isRepository ? 'folder' : selectedIconId;

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          name: discussionName.trim(),
          topic: isRepository ? 'Repository Storage' : '',
          icon: finalIcon,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (onDiscussionCreated) {
          onDiscussionCreated({
            id: data.discussion?.id,
            sectionId: selectedSectionId,
            name: discussionName.trim(),
            icon: finalIcon,
            isRepository,
          });
        }
        onClose();
      }
    } catch (err) {
      console.error('Failed to create discussion/repository:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const PrefixIconComponent = isRepository ? FolderSimple : getDiscussionIcon(selectedIconId);

  return (
    <div className="discord-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="discord-dialog-box discord-create-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-discussion-title"
      >
        <button
          type="button"
          className="discord-dialog-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} weight="bold" />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="discord-dialog-header">
            <h3 id="create-discussion-title" className="discord-dialog-title">
              <span className="create-discussion-title-prefix">
                {isRepository ? 'Create Repository' : 'Create Discussion'}
                {selectedSection ? ' in ' : ''}
              </span>
              {selectedSection && (
                <span className="create-discussion-section-name">
                  {selectedSection.name}
                </span>
              )}
            </h3>
            <p className="discord-dialog-subtitle">
              {isRepository
                ? 'Create a repository storage channel for resources and documents.'
                : selectedSection
                ? 'Create a new discussion or repository channel in this section.'
                : 'Start a discussion channel for meetings, updates, and chat.'}
            </p>
          </div>

          <div className="discord-dialog-body">
            {/* Section Selector (if multiple exist and not locked) */}
            {sections.length > 1 && (
              <div className="discord-dialog-field-group">
                <label className="discord-dialog-label label-geist">
                  SELECT SECTION
                </label>
                <div className="discord-custom-select-wrap" ref={sectionDropdownRef}>
                  <button
                    type="button"
                    id="discussion-section-select"
                    className={`discord-custom-select-trigger ${isSectionDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isSectionDropdownOpen}
                  >
                    <span>{selectedSection?.name || 'Select section'}</span>
                    <CaretDown size={14} weight="bold" className="discord-custom-select-caret" />
                  </button>

                  {isSectionDropdownOpen && (
                    <div className="discord-custom-select-menu" role="listbox" aria-label="Sections">
                      {sections.map((sec) => {
                        const isSelected = sec.id === selectedSectionId;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            className={`discord-custom-select-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedSectionId(sec.id);
                              setIsSectionDropdownOpen(false);
                            }}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span>{sec.name}</span>
                            {isSelected && (
                              <Check size={14} weight="bold" className="select-check-icon" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Name Input with Dynamic Prefix & Optional Icon Selection */}
            <div className="discord-dialog-field-group">
              <div className="field-label-row">
                <label htmlFor="discussion-name-input" className="discord-dialog-label">
                  {isRepository ? 'REPOSITORY NAME' : 'DISCUSSION NAME'}
                </label>
                {/* Fade in character counter strictly when typing */}
                <span
                  className={`char-counter-badge ${isTyping ? 'visible' : ''}`}
                  aria-live="polite"
                >
                  {discussionName.length} / 30
                </span>
              </div>

              <div className="discord-input-wrapper">
                <PrefixIconComponent
                  size={18}
                  weight={isRepository ? 'regular' : selectedIconId === 'hash' ? 'bold' : 'regular'}
                  className="input-prefix-icon"
                />
                <input
                  id="discussion-name-input"
                  type="text"
                  className={`discord-dialog-input with-prefix ${hasError ? 'input-validation-error' : ''}`}
                  value={discussionName}
                  onChange={handleNameChange}
                  onFocus={() => setIsTyping(discussionName.length > 0)}
                  onBlur={() => setIsTyping(false)}
                  placeholder={isRepository ? 'new-repository' : 'new-discussion'}
                  maxLength={30}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  style={{ paddingRight: isRepository ? 14 : 40 }}
                />

                {/* Icon Emoji Selection Button on the far right (Only when NOT a repository) */}
                {!isRepository && (
                  <div className="discord-icon-picker-wrap" ref={iconPickerRef}>
                    <button
                      type="button"
                      className={`discord-icon-picker-btn ${isIconPickerOpen ? 'active' : ''}`}
                      onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                      aria-label="Select discussion icon"
                      aria-expanded={isIconPickerOpen}
                    >
                      <Smiley size={18} weight="regular" />
                    </button>

                    {isIconPickerOpen && (
                      <div className="discord-icon-picker-popover" role="dialog" aria-label="Select icon">
                        <span className="discord-icon-picker-header">Select Icon</span>
                        <div className="discord-icon-picker-grid">
                          {DISCUSSION_ICON_OPTIONS.map((opt) => {
                            const IconComp = opt.component;
                            const isSelected = selectedIconId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                className={`discord-icon-picker-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedIconId(opt.id);
                                  setIsIconPickerOpen(false);
                                }}
                                aria-label={opt.name}
                              >
                                <IconComp
                                  size={18}
                                  weight={opt.id === 'hash' ? 'bold' : 'regular'}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Create Repository Toggle Card */}
            <div className="discord-toggle-card">
              <div className="toggle-card-left">
                <div className="toggle-icon-wrap">
                  <FolderSimple size={18} weight="bold" />
                </div>
                <div className="toggle-card-text">
                  <span className="toggle-card-title">Create Repository</span>
                  <span className="toggle-card-desc">
                    Storage for compiling resources and documents for this section.
                  </span>
                </div>
              </div>

              <label className="discord-switch" aria-label="Toggle repository creation">
                <input
                  type="checkbox"
                  checked={isRepository}
                  onChange={(e) => setIsRepository(e.target.checked)}
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
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Creating...'
                : isRepository
                ? 'Create Repository'
                : 'Create Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
