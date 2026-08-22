'use client';

import React, { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: 'danger' | 'primary' | 'warning';
  showCancel?: boolean;
  isLoading?: boolean;
  zIndex?: number;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'danger',
  showCancel = true,
  isLoading = false,
  zIndex,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'primary':
      case 'warning':
        return 'discord-modal-btn discord-modal-btn-save';
      case 'danger':
      default:
        return 'discord-modal-btn discord-modal-btn-danger';
    }
  };

  return (
    <div
      className="portal-modal-backdrop"
      onClick={onClose}
      role="presentation"
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className="portal-modal-card discord-logout-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        <div className="discord-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            <h2 id="confirmation-modal-title" className="discord-modal-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="discord-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {description && (
          <div className="discord-modal-body">
            {typeof description === 'string' ? (
              <p className="discord-modal-desc">{description}</p>
            ) : (
              description
            )}
          </div>
        )}

        <div className="discord-modal-separator" />

        <div
          className="discord-modal-footer"
          style={!showCancel ? { display: 'flex', justifyContent: 'flex-end' } : undefined}
        >
          {showCancel && (
            <button
              type="button"
              className="discord-modal-btn discord-modal-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              className={getConfirmBtnClass()}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
