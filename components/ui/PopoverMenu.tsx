'use client';

import React, { useEffect, useRef } from 'react';

export interface PopoverMenuItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export interface PopoverMenuProps {
  isOpen: boolean;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  items?: PopoverMenuItem[];
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'right' | 'full';
  position?: 'top' | 'bottom';
  width?: string | number;
}

export function PopoverMenu({
  isOpen,
  onClose,
  anchorRef,
  items,
  children,
  className = '',
  style,
  align = 'left',
  position = 'top',
  width,
}: PopoverMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`reusable-popover-menu ${position === 'bottom' ? 'position-bottom' : 'position-top'} ${align === 'full' ? 'align-full' : align === 'right' ? 'align-right' : 'align-left'} ${className}`}
      style={{ ...(width ? { width } : {}), ...style }}
      role="menu"
    >
      {items && items.length > 0
        ? items.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              className={`reusable-popover-item ${item.danger ? 'danger' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
              role="menuitem"
            >
              {item.icon && <span className="reusable-popover-icon">{item.icon}</span>}
              <span className="reusable-popover-label">{item.label}</span>
            </button>
          ))
        : children}
    </div>
  );
}
