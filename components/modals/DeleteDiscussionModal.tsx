'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
} from '@phosphor-icons/react/dist/ssr';

interface DeleteDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId?: string | null;
  targetName?: string;
  targetType?: 'discussion' | 'section';
  discussionId?: string | null;
  discussionName?: string;
  isPrivate?: boolean;
  onConfirmDelete: (target: { id: string; name: string; type?: 'discussion' | 'section' }) => void;
}

export function DeleteDiscussionModal({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetType = 'discussion',
  discussionId,
  discussionName,
  isPrivate = false,
  onConfirmDelete,
}: DeleteDiscussionModalProps) {
  const [step, setStep] = useState<'type-confirm' | 'final-confirm'>('type-confirm');
  const [confirmInput, setConfirmInput] = useState('');
  const [hasError, setHasError] = useState(false);

  const effectiveId = targetId ?? discussionId ?? null;
  const effectiveName = targetName ?? discussionName ?? '';
  const isSection = targetType === 'section';

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep('type-confirm');
      setConfirmInput('');
      setHasError(false);
    }
  }, [isOpen]);

  if (!isOpen || !effectiveId) return null;

  const isConfirmed = confirmInput.trim() === 'CONFIRM';

  const handleProceedToFinal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      setHasError(true);
      document.getElementById('delete-confirm-input')?.focus();
      return;
    }
    setHasError(false);
    setStep('final-confirm');
  };

  const handleExecuteDelete = () => {
    if (!effectiveId) return;
    onConfirmDelete({ id: effectiveId, name: effectiveName, type: targetType });
    onClose();
  };

  const entityTitle = isSection ? 'Delete Section' : 'Delete Discussion';
  const entityDisplayName = isSection ? effectiveName : `#${effectiveName}`;

  return (
    <div className="discord-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="discord-dialog-box discord-delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-discussion-title"
      >
        <button
          type="button"
          className="discord-dialog-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} weight="bold" />
        </button>
        {step === 'type-confirm' ? (
          /* STEP 1: GitHub-style Type CONFIRM Prompt */
          <div key="step-type-confirm" className="discord-delete-step-transition">
            <form
              onSubmit={handleProceedToFinal}
              className="discord-delete-form"
            >
              <div className="discord-dialog-header">
                <h3 id="delete-discussion-title" className="discord-dialog-title delete-modal-title">
                  {entityTitle}
                </h3>
                <p className="discord-dialog-subtitle delete-modal-subtitle">
                  Permanently remove <span className="delete-subtitle-channel">{entityDisplayName}</span> from this department repository.
                </p>
              </div>

              <div className="discord-dialog-body">
                {/* Warning box */}
                <div className="delete-warning-banner">
                  <p>
                    This action <strong>cannot be undone</strong>. This will permanently delete{' '}
                    <span className="delete-highlight-target">{entityDisplayName}</span>
                    {isSection
                      ? ', all discussions, messages, and files within this section.'
                      : ' channel, all messages, and member access permissions.'}
                  </p>
                </div>

                {/* Type confirmation instruction and input */}
                <div className="discord-dialog-field-group">
                  <label htmlFor="delete-confirm-input" className="discord-dialog-label delete-confirm-label">
                    PLEASE TYPE <span className="delete-confirm-word">“CONFIRM”</span> BELOW TO PROCEED:
                  </label>
                  <input
                    id="delete-confirm-input"
                    type="text"
                    className={`discord-dialog-input delete-confirm-input ${hasError ? 'input-validation-error' : ''}`}
                    value={confirmInput}
                    onChange={(e) => {
                      setConfirmInput(e.target.value);
                      if (hasError) setHasError(false);
                    }}
                    placeholder="CONFIRM"
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div className="discord-dialog-footer">
                <button
                  type="button"
                  className="discord-modal-btn discord-modal-btn-cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="discord-modal-btn discord-modal-btn-danger"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: Final Confirmation Dialogue with Delete and Cancel buttons */
          <div key="step-final-confirm" className="discord-delete-step-transition">
            <div className="discord-delete-form">
              <div className="discord-dialog-header">
                <h3 className="discord-dialog-title delete-modal-title">
                  Are you absolutely sure?
                </h3>
                <p className="discord-dialog-subtitle delete-modal-subtitle">
                  Final confirmation to delete <span className="delete-subtitle-channel">{entityDisplayName}</span>
                </p>
              </div>

              <div className="discord-dialog-body">
                <div className="delete-final-card">
                  <p>
                    You are about to permanently delete <strong>{entityDisplayName}</strong>. Once
                    deleted, all data is purged and cannot be recovered.
                  </p>
                </div>
              </div>

              <div className="discord-dialog-footer">
                <button
                  type="button"
                  className="discord-modal-btn discord-modal-btn-cancel"
                  onClick={() => setStep('type-confirm')}
                >
                  <ArrowLeft size={16} weight="bold" style={{ marginRight: 4 }} />
                  Back
                </button>
                <button
                  type="button"
                  className="discord-modal-btn discord-modal-btn-danger"
                  onClick={handleExecuteDelete}
                >
                  {isSection ? 'Delete Section' : 'Delete Discussion'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
