'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Image, FolderSimplePlus } from '@phosphor-icons/react/dist/ssr';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (serverName: string) => void;
}

export function CreateServerModal({ isOpen, onClose, onCreate }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setServerName('New Department Repository');
      setCreatedSuccess(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setCreatedSuccess(true);
      if (onCreate) onCreate(serverName);
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div className="discord-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="discord-dialog-box discord-create-server-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-server-title"
      >
        <button
          type="button"
          className="discord-dialog-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} weight="bold" />
        </button>

        {!createdSuccess ? (
          <form onSubmit={handleSubmit}>
            <div className="discord-dialog-header text-center">
              <h3 id="create-server-title" className="discord-dialog-title" style={{ textAlign: 'center' }}>
                Create Your Server / Repository
              </h3>
              <p className="discord-dialog-subtitle" style={{ textAlign: 'center', marginTop: 6 }}>
                Your department repository is where your team collaborates on documents, announcements, and events.
              </p>
            </div>

            <div className="discord-dialog-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {/* Upload Icon Placeholder */}
              <div className="create-server-upload-circle">
                <Image size={28} weight="duotone" className="upload-icon" />
                <span className="upload-label">UPLOAD ICON</span>
                <div className="upload-badge">
                  <Plus size={14} weight="bold" />
                </div>
              </div>

              {/* Server Name Field */}
              <div className="discord-dialog-field-group" style={{ width: '100%' }}>
                <label htmlFor="server-name-input" className="discord-dialog-label">
                  SERVER / REPOSITORY NAME
                </label>
                <input
                  id="server-name-input"
                  type="text"
                  className="discord-dialog-input"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="e.g. Allied Health Department"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="discord-dialog-footer" style={{ justifyContent: 'space-between', marginTop: 24 }}>
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
                disabled={isSubmitting || !serverName.trim()}
                style={{ backgroundColor: '#00ba58', borderColor: '#00ba58' }}
              >
                {isSubmitting ? 'Creating...' : 'Create Server'}
              </button>
            </div>
          </form>
        ) : (
          <div className="discord-dialog-body" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div className="discord-dialog-alert success" role="status" style={{ margin: 0, justifyContent: 'center' }}>
              <FolderSimplePlus size={22} weight="bold" />
              <span>Repository &quot;{serverName}&quot; created successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
