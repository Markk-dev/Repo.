'use client';

import { useEffect, useRef, useState } from 'react';
import { LockKey } from '@phosphor-icons/react/dist/ssr';

interface MobileFeatureBlockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

const CLOSE_THRESHOLD = 120;  // px downward to close
const UP_DAMPING      = 0.12; // resistance for upward drag
const MAX_UP_TRAVEL   = 14;   // hard cap upward px
const OFF_SCREEN      = 520;  // px below viewport to start/end animation

export function MobileFeatureBlockDrawer({
  isOpen,
  onClose,
  featureName = 'This feature',
}: MobileFeatureBlockDrawerProps) {
  const [isVisible, setIsVisible]               = useState(false);
  const [isClosing, setIsClosing]               = useState(false);
  const [drawerTranslateY, setDrawerTranslateY] = useState(OFF_SCREEN);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const drawerDragStartY = useRef<number | null>(null);

  // ── Entry / exit purely via inline transform — no CSS animation ───
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setIsDraggingDrawer(false);
      // Start off-screen, then slide in via transition on next paint
      setDrawerTranslateY(OFF_SCREEN);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDrawerTranslateY(0);
        });
      });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setDrawerTranslateY(OFF_SCREEN); // slide out via transition
    setTimeout(() => {
      setIsVisible(false);
      onClose();
      setIsClosing(false);
      setDrawerTranslateY(OFF_SCREEN);
    }, 300);
  };

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isClosing]);

  // ── Touch ─────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    drawerDragStartY.current = e.touches[0].clientY;
    setIsDraggingDrawer(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (drawerDragStartY.current === null) return;
    const diff = e.touches[0].clientY - drawerDragStartY.current;
    if (diff > 0) {
      setDrawerTranslateY(diff);
    } else {
      // Upward — elastic resistance + hard cap
      setDrawerTranslateY(Math.max(diff * UP_DAMPING, -MAX_UP_TRAVEL));
    }
  };

  const handleTouchEnd = () => {
    if (drawerDragStartY.current === null) return;
    if (drawerTranslateY > CLOSE_THRESHOLD) {
      handleClose();
    } else {
      setDrawerTranslateY(0); // spring back — transition is active because isDragging → false
    }
    setIsDraggingDrawer(false);
    drawerDragStartY.current = null;
  };

  // ── Mouse — mirrors UserSettingsModal exactly ─────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    drawerDragStartY.current = e.clientY;
    setIsDraggingDrawer(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (drawerDragStartY.current === null) return;
      const diff = moveEvent.clientY - drawerDragStartY.current;
      if (diff > 0) {
        setDrawerTranslateY(diff);
      } else {
        setDrawerTranslateY(Math.max(diff * UP_DAMPING, -MAX_UP_TRAVEL));
      }
    };

    const handleMouseUp = () => {
      if (drawerDragStartY.current !== null) {
        setDrawerTranslateY((curr) => {
          if (curr > CLOSE_THRESHOLD) {
            handleClose();
          }
          return 0; // always snap back — transition fires because isDragging is false in this render
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

  if (!isVisible) return null;

  return (
    <div
      className={`mfb-backdrop ${isClosing ? 'mfb-backdrop--closing' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="mfb-drawer"
        style={{
          transform: `translateY(${drawerTranslateY}px)`,
          // Transition is active whenever NOT dragging — covers entry, exit, and spring-back
          transition: isDraggingDrawer
            ? 'none'
            : 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Feature unavailable on mobile"
      >
        {/* ── Drag handle ── */}
        <div
          className="mfb-drag-handle-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
        >
          <div className="mfb-drag-pill" />
        </div>

        {/* ── Lock icon ── */}
        <div className="mfb-icon-wrap">
          <LockKey size={36} weight="duotone" />
        </div>

        {/* ── Copy ── */}
        <h2 className="mfb-title">{featureName} is not available on mobile</h2>
        <p className="mfb-desc">
          This feature requires a larger screen. Switch to a{' '}
          <strong>tablet or laptop</strong> to access it.
        </p>

        {/* ── Dismiss ── */}
        <button
          type="button"
          id="mfb-dismiss-btn"
          className="mfb-dismiss-btn"
          onClick={handleClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
