'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Users,
  TextAlignLeft,
  X,
  CalendarBlank,
} from '@phosphor-icons/react/dist/ssr';
import { DatePickerCalendar } from '@/components/ui/DatePickerCalendar';
import { TimePickerPopover } from '@/components/ui/TimePickerPopover';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "10:00"
  allDay?: boolean;
  repeat?: string;
  guests?: string;
  hasMeet?: boolean;
  location?: string;
  description?: string;
  color?: string;
}

export const PASTEL_PALETTES = [
  {
    name: 'Purple',
    bgLight: '#f5f0ff',
    bgDark: '#e8dcff',
    border: '#d3bcfe',
    text: '#6824a7',
    subText: '#873fcb',
    stripe: 'rgba(104, 36, 167, 0.18)',
  },
  {
    name: 'Blue',
    bgLight: '#f0f7ff',
    bgDark: '#dbeafe',
    border: '#bfdbfe',
    text: '#1d4ed8',
    subText: '#2563eb',
    stripe: 'rgba(29, 78, 216, 0.18)',
  },
  {
    name: 'Green',
    bgLight: '#f0fdf4',
    bgDark: '#dcfce7',
    border: '#bbf7d0',
    text: '#15803d',
    subText: '#16a34a',
    stripe: 'rgba(21, 128, 61, 0.18)',
  },
  {
    name: 'Amber',
    bgLight: '#fffbeb',
    bgDark: '#fef3c7',
    border: '#fde68a',
    text: '#b45309',
    subText: '#d97706',
    stripe: 'rgba(180, 83, 9, 0.18)',
  },
  {
    name: 'Rose',
    bgLight: '#fff1f2',
    bgDark: '#ffe4e6',
    border: '#fecdd3',
    text: '#be123c',
    subText: '#e11d48',
    stripe: 'rgba(190, 18, 60, 0.18)',
  },
  {
    name: 'Teal',
    bgLight: '#f0fdfa',
    bgDark: '#ccfbf1',
    border: '#99f6e4',
    text: '#0f766e',
    subText: '#0d9488',
    stripe: 'rgba(15, 118, 110, 0.18)',
  },
];

export function getEventPastelPalette(event: CalendarEvent | { id?: string; title?: string }) {
  const str = (event.id || '') + (event.title || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  initialEvent?: Partial<CalendarEvent> | null;
  userName?: string;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateMMDDYYYY(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  } catch {
    return dateStr;
  }
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  initialEvent,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [guests, setGuests] = useState('');
  const [description, setDescription] = useState('');
  const [isTimeEditing, setIsTimeEditing] = useState(false);

  // Drag-to-dismiss states for mobile drawer
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);

  // Check if viewing a past event
  const isPast = initialEvent?.date
    ? initialEvent.date < '2026-08-21' ||
      (initialEvent.date === '2026-08-21' && (initialEvent.endTime || '23:59') <= '15:20')
    : false;

  // Popover controls
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  useEffect(() => {
    const todayStr = '2026-08-21';
    if (initialEvent) {
      const initialDate = initialEvent.date ? initialEvent.date : todayStr;
      setTitle(initialEvent.title || '');
      setDate(initialDate);
      setStartTime(initialEvent.startTime || '16:00');
      setEndTime(initialEvent.endTime || '17:00');
      setGuests(initialEvent.guests || '');
      setDescription(initialEvent.description || '');
      setIsTimeEditing(false);
    } else {
      setTitle('');
      setDate(todayStr);
      setStartTime('16:00');
      setEndTime('17:00');
      setGuests('');
      setDescription('');
      setIsTimeEditing(false);
    }
    setDragOffset(0);
    setIsDragging(false);
  }, [initialEvent, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Touch and Mouse drag-to-dismiss listeners
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragOffset(0);
    }, 240);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDragOffset(0);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const diff = e.touches[0].clientY - dragStartYRef.current;
    if (diff > 0) {
      setDragOffset(diff);
    } else {
      setDragOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    setIsDragging(false);
    if (dragOffset > 75) {
      handleClose();
    }
    setDragOffset(0);
    dragStartYRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || dragStartYRef.current === null) return;
      const diff = e.clientY - dragStartYRef.current;
      if (diff > 0) {
        setDragOffset(diff);
      } else {
        setDragOffset(0);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      if (dragOffset > 75) {
        handleClose();
      }
      setDragOffset(0);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPast) {
      handleClose();
      return;
    }

    if (!title.trim()) {
      return; // Do NOT accept event with no title
    }

    const todayStr = '2026-08-21';
    // Validate past event prevention
    if (date < todayStr || (date === todayStr && startTime < '15:20')) {
      return;
    }

    const eventToSave: CalendarEvent = {
      id: initialEvent?.id || `evt-${Date.now()}`,
      title: title.trim(),
      date,
      startTime,
      endTime,
      allDay: false,
      guests: guests.trim(),
      description: description.trim(),
    };
    onSave(eventToSave);
    handleClose();
  };

  const formattedFullDate = formatFullDate(date);
  const formattedMMDDDate = formatDateMMDDYYYY(date);
  const formattedStartTime = formatDisplayTime(startTime);
  const formattedEndTime = formatDisplayTime(endTime);

  const isSaveDisabled = !title.trim() || isPast;

  return (
    <div
      className={`portal-modal-backdrop gcal-modal-backdrop-mobile ${isClosing ? 'backdrop-closing' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`portal-modal-card gcal-portal-modal-card gcal-drawer-card ${isClosing ? 'drawer-closing modal-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-modal-title"
        style={{
          transform:
            typeof window !== 'undefined' && window.innerWidth <= 640 && dragOffset > 0
              ? `translateY(${dragOffset}px)`
              : undefined,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile Draggable Handle Zone */}
        <div
          className="gcal-drawer-handle-zone"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
        >
          <div className="gcal-drawer-handle-pill" />
        </div>

        {/* Header with medium weight title and clean close button only */}
        <div className="discord-modal-header">
          <h2
            id="gcal-modal-title"
            className="discord-modal-title"
            style={{ fontWeight: 500, fontSize: '17px' }}
          >
            {initialEvent?.id ? (isPast ? 'Event Details (Past)' : 'Edit Event') : 'Add Event'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="discord-modal-close-btn"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="gcal-portal-modal-form">
          <div className="gcal-portal-modal-body">
            {/* Title Input */}
            <div className="gcal-portal-title-row">
              <input
                type="text"
                id="gcal-event-title"
                className="gcal-portal-title-input"
                placeholder="Add title"
                value={title}
                readOnly={isPast}
                disabled={isPast}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus={!isPast}
              />
            </div>

            {/* Time / Date Section */}
            <div className="gcal-portal-row">
              <div className="gcal-portal-icon-box">
                <Clock size={19} weight="regular" className="gcal-portal-icon" />
              </div>

              <div className="gcal-portal-row-content">
                {!isTimeEditing || isPast ? (
                  /* Collapsed view */
                  <div
                    className={`gcal-time-summary-box ${isPast ? 'disabled' : ''}`}
                    onClick={isPast ? undefined : () => setIsTimeEditing(true)}
                    role="button"
                    tabIndex={isPast ? -1 : 0}
                    onKeyDown={(e) => {
                      if (!isPast && (e.key === 'Enter' || e.key === ' ')) {
                        setIsTimeEditing(true);
                      }
                    }}
                    title={isPast ? 'Past event cannot be rescheduled' : 'Click to edit time'}
                  >
                    <div className="gcal-time-summary-primary" style={{ fontWeight: 500 }}>
                      <span>{formattedFullDate}</span>
                      <span>
                        {formattedStartTime} – {formattedEndTime}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Expanded view */
                  <div className="gcal-time-expanded-box">
                    <div className="gcal-datetime-chips-row">
                      {/* Date Chip Button */}
                      <div className="gcal-picker-anchor">
                        <button
                          type="button"
                          className="gcal-chip-btn"
                          onClick={() => {
                            setDatePickerOpen(!datePickerOpen);
                            setStartTimePickerOpen(false);
                            setEndTimePickerOpen(false);
                          }}
                        >
                          <span>{formattedMMDDDate || 'Select date'}</span>
                          <CalendarBlank size={15} weight="regular" />
                        </button>

                        {datePickerOpen && (
                          <DatePickerCalendar
                            selectedDate={date}
                            onSelect={(newDate) => {
                              if (newDate) setDate(newDate);
                            }}
                            onClose={() => setDatePickerOpen(false)}
                          />
                        )}
                      </div>

                      {/* Start Time Chip */}
                      <div className="gcal-chip-time-group">
                        <div className="gcal-picker-anchor">
                          <button
                            type="button"
                            className="gcal-chip-btn time"
                            onClick={() => {
                              setStartTimePickerOpen(!startTimePickerOpen);
                              setDatePickerOpen(false);
                              setEndTimePickerOpen(false);
                            }}
                          >
                            <span>{formattedStartTime}</span>
                            <Clock size={15} weight="regular" />
                          </button>

                          {startTimePickerOpen && (
                            <TimePickerPopover
                              selectedTime={startTime}
                              minTime={date === '2026-08-21' ? '15:30' : undefined}
                              onSelect={(newTime) => {
                                setStartTime(newTime);
                                if (endTime <= newTime) {
                                  const [h, m] = newTime.split(':').map(Number);
                                  const nextH = Math.min(23, h + 1).toString().padStart(2, '0');
                                  setEndTime(`${nextH}:${m.toString().padStart(2, '0')}`);
                                }
                              }}
                              onClose={() => setStartTimePickerOpen(false)}
                            />
                          )}
                        </div>

                        <span className="gcal-chip-sep">–</span>

                        {/* End Time Chip */}
                        <div className="gcal-picker-anchor">
                          <button
                            type="button"
                            className="gcal-chip-btn time"
                            onClick={() => {
                              setEndTimePickerOpen(!endTimePickerOpen);
                              setDatePickerOpen(false);
                              setStartTimePickerOpen(false);
                            }}
                          >
                            <span>{formattedEndTime}</span>
                            <Clock size={15} weight="regular" />
                          </button>

                          {endTimePickerOpen && (
                            <TimePickerPopover
                              selectedTime={endTime}
                              minTime={startTime}
                              onSelect={(newTime) => setEndTime(newTime)}
                              onClose={() => setEndTimePickerOpen(false)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guests Row */}
            <div className="gcal-portal-row">
              <div className="gcal-portal-icon-box">
                <Users size={19} weight="regular" className="gcal-portal-icon" />
              </div>
              <div className="gcal-portal-row-content">
                <input
                  type="text"
                  className="gcal-portal-inline-input"
                  placeholder={isPast ? 'No guests added' : 'Add guests'}
                  value={guests}
                  readOnly={isPast}
                  disabled={isPast}
                  onChange={(e) => setGuests(e.target.value)}
                />
              </div>
            </div>

            {/* Description Row */}
            <div className="gcal-portal-row items-start">
              <div className="gcal-portal-icon-box" style={{ marginTop: '2px' }}>
                <TextAlignLeft size={19} weight="regular" className="gcal-portal-icon" />
              </div>
              <div className="gcal-portal-row-content">
                <textarea
                  className="gcal-portal-inline-textarea"
                  placeholder={isPast ? 'No description added' : 'Add description or attachment'}
                  rows={2}
                  value={description}
                  readOnly={isPast}
                  disabled={isPast}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Divider Separator */}
          <div className="discord-modal-separator" />

          {/* Modal Footer with Cancel & Save */}
          <div className="discord-modal-footer">
            <button
              type="button"
              className="discord-modal-btn discord-modal-btn-cancel"
              style={{ fontWeight: 500 }}
              onClick={handleClose}
            >
              {isPast ? 'Close' : 'Cancel'}
            </button>
            {!isPast && (
              <button
                type="submit"
                disabled={isSaveDisabled}
                className="discord-modal-btn discord-modal-btn-save"
                style={{
                  fontWeight: 500,
                  opacity: isSaveDisabled ? 0.5 : 1,
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
