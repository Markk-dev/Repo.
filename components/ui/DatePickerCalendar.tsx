'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CaretLeft,
  CaretRight,
  CaretDown,
} from '@phosphor-icons/react/dist/ssr';

interface DatePickerCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerCalendar({
  selectedDate,
  onSelect,
  onClose,
}: DatePickerCalendarProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const initial = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(initial.getMonth() || 7); // 0-indexed

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate 42 calendar grid cells (6 rows x 7 days)
  const getGridDays = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const str = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      days.push({ dayNum, dateStr: str, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const str = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr: str, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      const str = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr: str, isCurrentMonth: false });
    }

    return days;
  };

  const gridDays = getGridDays();
  const getDynamicToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getDynamicToday();

  return (
    <div className="shadcn-calendar-popover" ref={popoverRef} role="dialog">
      {/* Month & Navigation Header (Screenshot 1 match) */}
      <div className="shadcn-calendar-header">
        <button
          type="button"
          className="shadcn-calendar-title-btn"
          aria-label="Select month and year"
        >
          <span>
            {monthName} {viewYear}
          </span>
          <CaretDown size={12} weight="bold" />
        </button>

        <div className="shadcn-calendar-nav-arrows">
          <button
            type="button"
            className="shadcn-cal-arrow-btn"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            type="button"
            className="shadcn-cal-arrow-btn"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="shadcn-calendar-weekdays">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="shadcn-calendar-weekday-cell">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="shadcn-calendar-days-grid">
        {gridDays.map((d, idx) => {
          const isSelected = d.dateStr === selectedDate;
          const isTodayDate = d.dateStr === todayStr;
          const isPast = d.dateStr < todayStr;

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              className={`shadcn-cal-day-cell ${!d.isCurrentMonth ? 'outside' : ''} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${isPast ? 'disabled' : ''}`}
              onClick={() => {
                if (!isPast) {
                  onSelect(d.dateStr);
                  onClose();
                }
              }}
            >
              {d.dayNum}
            </button>
          );
        })}
      </div>

      {/* Footer: Clear & Today */}
      <div className="shadcn-calendar-footer">
        <button
          type="button"
          className="shadcn-cal-footer-btn"
          onClick={() => {
            onSelect(todayStr);
            onClose();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="shadcn-cal-footer-btn highlight"
          onClick={() => {
            onSelect(todayStr);
            onClose();
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
}
