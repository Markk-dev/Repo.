'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CaretLeft,
  CaretRight,
  Plus,
  Clock,
  Trash,
} from '@phosphor-icons/react/dist/ssr';
import { EventModal, CalendarEvent, getEventPastelPalette } from '@/components/events/EventModal';
import { Tooltip } from '@/components/ui/Tooltip';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const isPastEvent = (eventDate: string, eventEndTime: string) => {
  const todayKey = '2026-08-21';
  const currentTime = '15:20';
  if (eventDate < todayKey) return true;
  if (eventDate === todayKey && eventEndTime <= currentTime) return true;
  return false;
};

interface CalendarViewProps {
  userName?: string;
  onBack?: () => void;
}

export function CalendarView({ userName = 'Mark Vincent Madrid', onBack }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date('2026-08-21T09:00:00'));
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sacli_user_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return []; // No placeholder data events as requested
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to ~8 AM on mount
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 480; // 8:00 AM position (8 * 60px)
    }
  }, []);

  const saveEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sacli_user_events', JSON.stringify(updated));
    }
  };

  const handleSaveEvent = (eventToSave: CalendarEvent) => {
    const exists = events.some((e) => e.id === eventToSave.id);
    if (exists) {
      saveEvents(events.map((e) => (e.id === eventToSave.id ? eventToSave : e)));
    } else {
      saveEvents([...events, eventToSave]);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    saveEvents(events.filter((e) => e.id !== eventId));
  };

  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const startOfWeek = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      return dayDate;
    });
  };

  const weekDays = getWeekDays(currentDate);

  const formatMonthYear = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const navigateToday = () => {
    setCurrentDate(new Date('2026-08-21T09:00:00'));
  };

  const isToday = (d: Date) => {
    const today = new Date('2026-08-21');
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleSlotClick = (dateStr: string, hour: number) => {
    const todayKey = '2026-08-21';
    const currentHour = 15;
    if (dateStr < todayKey) return;
    if (dateStr === todayKey && hour < currentHour) return;

    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${Math.min(23, hour + 1).toString().padStart(2, '0')}:00`;
    setSelectedEvent({
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      allDay: false,
    });
    setModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setModalOpen(true);
  };

  return (
    <div className="gcal-embedded-container">
      {/* Top Header bar with Google Calendar Controls */}
      <header className="gcal-topbar">
        <div className="gcal-topbar-left">
          {onBack && (
            <button
              type="button"
              className="gcal-mobile-back-btn"
              onClick={onBack}
              aria-label="Back to channels"
              title="Channels"
            >
              <CaretLeft size={20} weight="bold" />
            </button>
          )}

          <button
            type="button"
            className="gcal-today-btn"
            onClick={navigateToday}
          >
            Today
          </button>

          {/* Desktop/Tablet Left-Aligned Nav Controls */}
          <div className="gcal-desktop-nav-group">
            <div className="gcal-arrows-group">
              <Tooltip content="Previous" position="bottom">
                <button
                  type="button"
                  className="gcal-arrow-btn"
                  onClick={navigatePrev}
                  aria-label="Previous"
                >
                  <CaretLeft size={16} weight="bold" />
                </button>
              </Tooltip>

              <Tooltip content="Next" position="bottom">
                <button
                  type="button"
                  className="gcal-arrow-btn"
                  onClick={navigateNext}
                  aria-label="Next"
                >
                  <CaretRight size={16} weight="bold" />
                </button>
              </Tooltip>
            </div>

            <h2 className="gcal-month-title">{formatMonthYear(currentDate)}</h2>
          </div>
        </div>

        {/* Mobile-Only Centered Nav Controls: [< Arrow Left] [August 2026] [> Arrow Right] */}
        <div className="gcal-mobile-nav-group">
          <Tooltip content="Previous" position="bottom">
            <button
              type="button"
              className="gcal-arrow-btn"
              onClick={navigatePrev}
              aria-label="Previous"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
          </Tooltip>

          <h2 className="gcal-month-title">{formatMonthYear(currentDate)}</h2>

          <Tooltip content="Next" position="bottom">
            <button
              type="button"
              className="gcal-arrow-btn"
              onClick={navigateNext}
              aria-label="Next"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </Tooltip>
        </div>

        <div className="gcal-topbar-right">
          <button
            type="button"
            className="gcal-create-event-btn"
            onClick={() => {
              setSelectedEvent(null);
              setModalOpen(true);
            }}
            aria-label="Add event"
          >
            <Plus size={16} weight="bold" />
            <span className="gcal-btn-text">Add event</span>
          </button>
        </div>
      </header>

      {/* Main Calendar Viewport (Desktop Grid + Mobile Agenda Feed) */}
      <div className="gcal-calendar-viewport">
        {/* Mobile Schedule Feed (Visible only on mobile <= 768px) */}
        <div className="gcal-mobile-schedule-feed">
          {weekDays.map((d) => {
            const dateKey = d.toISOString().split('T')[0];
            const active = isToday(d);
            const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateNum = d.getDate();

            const dayEvents = events.filter((e) => e.date === dateKey);

            return (
              <div key={dateKey} className={`gcal-mobile-day-row ${active ? 'is-today' : ''}`}>
                {/* Left Date Column (Vertical) */}
                <div className="gcal-mobile-date-col">
                  <span className={`gcal-mobile-weekday-name ${active ? 'is-today' : ''}`}>{dayStr}</span>
                  <span className={`gcal-mobile-date-pill ${active ? 'is-today' : ''}`}>{dateNum}</span>
                </div>

                {/* Right Events Stack */}
                <div className="gcal-mobile-events-stack">
                  {dayEvents.length === 0 ? (
                    <button
                      type="button"
                      className="gcal-mobile-empty-slot"
                      onClick={() => handleSlotClick(dateKey, 16)}
                      aria-label="Add event on this date"
                    />
                  ) : (
                    dayEvents.map((evt) => {
                      const palette = getEventPastelPalette(evt);
                      const isPast = isPastEvent(evt.date, evt.endTime);

                      return (
                        <div
                          key={evt.id}
                          className={`gcal-mobile-event-card ${isPast ? 'is-past-slashed' : ''}`}
                          style={{
                            background: isPast
                              ? `repeating-linear-gradient(135deg, ${palette.stripe} 0px, ${palette.stripe} 1.5px, transparent 1.5px, transparent 6px), linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`
                              : `linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`,
                            borderColor: palette.border,
                          }}
                          onClick={(e) => handleEventClick(evt, e)}
                        >
                          <div className="gcal-mobile-event-content">
                            <div className="gcal-mobile-event-title" style={{ color: palette.text }}>
                              {evt.title}
                            </div>
                            <div className="gcal-mobile-event-time" style={{ color: palette.subText }}>
                              <Clock size={13} weight="regular" />
                              <span>{evt.startTime} – {evt.endTime}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="gcal-mobile-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(evt.id);
                            }}
                            title="Delete event"
                            aria-label="Delete event"
                          >
                            <Trash size={14} weight="bold" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Weekly Hour Grid (Visible only on desktop > 768px) */}
        <div className="gcal-desktop-grid-view">
          {/* Days Header Row */}
          <div className="gcal-days-header-row">
            <div className="gcal-timezone-corner" />

            <div className="gcal-days-columns-header">
              {weekDays.map((d, index) => {
                const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dateNum = d.getDate();
                const active = isToday(d);

                return (
                  <div key={index} className={`gcal-day-header-cell ${active ? 'is-today' : ''}`}>
                    <div className="gcal-day-name">{dayStr}</div>
                    <div className={`gcal-day-number ${active ? 'active-pill' : ''}`}>
                      {dateNum}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable Hours Grid */}
          <div className="gcal-grid-scroll" ref={gridScrollRef}>
            <div className="gcal-grid-body">
              {/* Time labels column on left */}
              <div className="gcal-time-labels-col">
                {HOURS.map((hour) => {
                  const hourFormatted =
                    hour === 0
                      ? ''
                      : hour === 12
                      ? '12 PM'
                      : hour > 12
                      ? `${hour - 12} PM`
                      : `${hour} AM`;

                  return (
                    <div key={hour} className="gcal-time-label-cell">
                      <span>{hourFormatted}</span>
                    </div>
                  );
                })}
              </div>

              {/* Day columns grid */}
              <div className="gcal-grid-days-container">
                {weekDays.map((d, dayIndex) => {
                  const dateKey = d.toISOString().split('T')[0];
                  const active = isToday(d);

                  const dayEvents = events.filter((e) => e.date === dateKey);

                  return (
                    <div key={dayIndex} className={`gcal-grid-day-col ${active ? 'is-today' : ''}`}>
                      {/* Hour row grid lines and click zones */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="gcal-hour-cell"
                          onClick={() => handleSlotClick(dateKey, hour)}
                        />
                      ))}

                      {/* Red Current Time Indicator Line on Today */}
                      {active && (
                        <div
                          className="gcal-current-time-indicator"
                          style={{
                            top: `${(15 * 60 + 20) * (60 / 60)}px`,
                          }}
                        >
                          <div className="gcal-time-dot" />
                          <div className="gcal-time-line" />
                        </div>
                      )}

                      {/* Event Blocks positioned dynamically by start time and duration */}
                      {dayEvents.map((evt) => {
                        const startMin = timeToMinutes(evt.startTime);
                        const endMin = timeToMinutes(evt.endTime);
                        const duration = Math.max(30, endMin - startMin);
                        const topPx = (startMin / 60) * 60;
                        const heightPx = Math.max(26, (duration / 60) * 60 - 2);

                        const palette = getEventPastelPalette(evt);
                        const isPast = isPastEvent(evt.date, evt.endTime);

                        return (
                          <div
                            key={evt.id}
                            className={`gcal-event-card ${isPast ? 'is-past-slashed' : ''}`}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              background: isPast
                                ? `repeating-linear-gradient(135deg, ${palette.stripe} 0px, ${palette.stripe} 1.5px, transparent 1.5px, transparent 6px), linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`
                                : `linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`,
                              borderColor: palette.border,
                              color: palette.text,
                            }}
                            onClick={(e) => handleEventClick(evt, e)}
                            title={`${evt.title} (${evt.startTime} - ${evt.endTime})`}
                          >
                            <div className="gcal-event-card-top-row">
                              <div className="gcal-event-card-title" style={{ color: palette.text, fontWeight: 500 }}>
                                {evt.title}
                              </div>
                              <button
                                type="button"
                                className="gcal-event-card-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(evt.id);
                                }}
                                title="Delete event"
                                aria-label="Delete event"
                              >
                                <Trash size={11} weight="bold" />
                              </button>
                            </div>
                            <div className="gcal-event-card-time" style={{ color: palette.subText, fontWeight: 500 }}>
                              <Clock size={12} weight="regular" />
                              <span>
                                {evt.startTime} – {evt.endTime}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Creation & Edit Modal */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={selectedEvent}
        userName={userName}
      />
    </div>
  );
}
