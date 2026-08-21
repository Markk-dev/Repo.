'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'bottom',
  className = '',
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <div className={`custom-tooltip-wrapper ${className}`}>
      {children}
      <div className={`custom-tooltip-bubble pos-${position}`} role="tooltip">
        <div className="custom-tooltip-arrow" />
        <span>{content}</span>
      </div>
    </div>
  );
}
