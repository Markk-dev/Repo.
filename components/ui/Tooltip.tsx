'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
  showArrow?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'bottom',
  align = 'center',
  showArrow = false,
  className = '',
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <div className={`custom-tooltip-wrapper ${className}`}>
      {children}
      <div className={`custom-tooltip-bubble pos-${position} align-${align} ${!showArrow ? 'no-arrow' : ''}`} role="tooltip">
        {showArrow && <div className="custom-tooltip-arrow" />}
        <span>{content}</span>
      </div>
    </div>
  );
}
