'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { WarningCircle, CheckCircle, X, Info, Trash, ClockCountdown } from '@phosphor-icons/react/dist/ssr';

export type ToastType = 'error' | 'delete' | 'success' | 'done' | 'warning' | 'pending' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'error',
  onClose,
  duration = 4000,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [isExiting, onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash size={18} weight="bold" className="toast-icon delete" />;
      case 'pending':
      case 'warning':
      case 'info':
        return <ClockCountdown size={18} weight="bold" className="toast-icon pending" />;
      case 'success':
      case 'done':
        return <CheckCircle size={18} weight="fill" className="toast-icon success" />;
      case 'error':
      default:
        return <WarningCircle size={18} weight="fill" className="toast-icon error" />;
    }
  };

  return (
    <div
      className={`portal-toast toast-${type} ${isExiting ? 'exiting' : ''}`}
      role="alert"
    >
      <div className="toast-left">
        {getIcon()}
        <span className="toast-message">{message}</span>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={handleClose}
        aria-label="Dismiss notification"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
