'use client';

import React, { useEffect, useRef } from 'react';

interface TimePickerPopoverProps {
  selectedTime: string; // "HH:MM"
  minTime?: string; // "HH:MM"
  onSelect: (timeStr: string) => void;
  onClose: () => void;
}

// Generate 30-minute intervals
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  const hStr = h.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hStr}:00`);
  TIME_SLOTS.push(`${hStr}:30`);
}

function formatSlot12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

export function TimePickerPopover({
  selectedTime,
  minTime,
  onSelect,
  onClose,
}: TimePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'center' });
    }
  }, []);

  return (
    <div className="shadcn-time-popover" ref={popoverRef} role="listbox">
      {TIME_SLOTS.map((slot) => {
        const isSelected = slot === selectedTime;
        const isPastSlot = !!(minTime && slot < minTime);

        return (
          <button
            key={slot}
            ref={isSelected ? activeItemRef : null}
            type="button"
            disabled={isPastSlot}
            className={`shadcn-time-option ${isSelected ? 'selected' : ''} ${isPastSlot ? 'disabled' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isPastSlot) {
                onSelect(slot);
                onClose();
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isPastSlot) {
                onSelect(slot);
                onClose();
              }
            }}
          >
            {formatSlot12(slot)}
          </button>
        );
      })}
    </div>
  );
}
