'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  MagnifyingGlass,
  Question,
  Gear,
  Calendar,
  CheckSquareOffset,
  Plus,
  ArrowLeft,
  List,
  DotsThreeVertical,
  CalendarBlank,
} from '@phosphor-icons/react/dist/ssr';
import { EventModal, CalendarEvent } from '@/components/events/EventModal';
import { Tooltip } from '@/components/ui/Tooltip';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function EventsPage() {
  const router = useRouter();
  const { employee } = useAuth();
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
    return [];
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | '3day'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to current time or ~8 AM on load
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 480; // 8:00 AM position (8 * 60px)
    }
  }, []);

  // Save events to local storage
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

  // Helper to compute start of current week (Sunday)
  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // adjust when day is sunday
    const startOfWeek = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      return dayDate;
    });
  };

  // 3-day view for mobile
  const getThreeDays = (date: Date) => {
    const d = new Date(date);
    return Array.from({ length: 3 }, (_, i) => {
      const dayDate = new Date(d);
      dayDate.setDate(d.getDate() + i);
      return dayDate;
    });
  };

  const weekDays = getWeekDays(currentDate);
  const threeDays = getThreeDays(currentDate);

  const formatMonthYear = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === '3day') d.setDate(d.getDate() - 3);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === '3day') d.setDate(d.getDate() + 3);
    else d.setDate(d.getDate() + 7);
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

  // Convert "HH:MM" to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Handle clicking empty time slot to create event
  const handleSlotClick = (dateStr: string, hour: number) => {
    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setSelectedEvent({
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      allDay: false,
    });
    setModalOpen(true);
  };

  // Handle clicking an existing event
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Filter events matching active dates
  const displayedDays = viewMode === '3day' ? threeDays : weekDays;

  return (
    <div className="gcal-page-wrapper">
      {/* Top Header bar with Google Calendar Controls */}
      <header className="gcal-topbar">
        <div className="gcal-topbar-left">
          <button
            type="button"
            className="gcal-back-home-btn"
            onClick={() => router.push('/')}
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} weight="bold" />
            <span className="gcal-app-brand">SACLI Portal</span>
          </button>

          <div className="gcal-nav-controls">
            <button
              type="button"
              className="gcal-today-btn"
              onClick={navigateToday}
            >
              Today
            </button>

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

        <div className="gcal-topbar-right">
          <div className={`gcal-search-box ${searchActive ? 'active' : ''}`}>
            <MagnifyingGlass size={18} weight="bold" className="gcal-search-icon" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchActive(true)}
              onBlur={() => setSearchActive(false)}
            />
          </div>

          <Tooltip content="Support" position="bottom">
            <button
              type="button"
              className="gcal-icon-action-btn"
              aria-label="Support"
            >
              <Question size={20} weight="regular" />
            </button>
          </Tooltip>

          <Tooltip content="Settings" position="bottom">
            <button
              type="button"
              className="gcal-icon-action-btn"
              aria-label="Settings"
            >
              <Gear size={20} weight="regular" />
            </button>
          </Tooltip>

          {/* View Dropdown */}
          <div className="gcal-view-selector-wrapper">
            <select
              className="gcal-view-select"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
            >
              <option value="week">Week</option>
              <option value="3day">3 Days</option>
              <option value="day">Day</option>
            </select>
          </div>

          <div className="gcal-view-icon-toggles">
            <Tooltip content="Calendar View" position="bottom">
              <button
                type="button"
                className="gcal-view-toggle active"
                aria-label="Calendar View"
              >
                <Calendar size={18} weight="fill" />
              </button>
            </Tooltip>

            <Tooltip content="Tasks View" position="bottom">
              <button
                type="button"
                className="gcal-view-toggle"
                aria-label="Tasks View"
              >
                <CheckSquareOffset size={18} weight="regular" />
              </button>
            </Tooltip>
          </div>

          <button
            type="button"
            className="gcal-create-event-btn"
            onClick={() => {
              setSelectedEvent(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} weight="bold" />
            <span>Create</span>
          </button>
        </div>
      </header>

      {/* Main Calendar Viewport */}
      <main className="gcal-calendar-viewport">
        {/* Days Header Row (SUN 16, MON 17, ..., FRI 21 [Active blue]) */}
        <div className="gcal-days-header-row">
          <div className="gcal-timezone-corner">
            <span>GMT+08</span>
          </div>

          <div className="gcal-days-columns-header">
            {displayedDays.map((d, index) => {
              const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const dateNum = d.getDate();
              const active = isToday(d);
              const dateKey = d.toISOString().split('T')[0];

              // Find all-day events for this day
              const allDayEvents = events.filter(
                (e) => e.allDay && e.date === dateKey
              );

              return (
                <div key={index} className={`gcal-day-header-cell ${active ? 'is-today' : ''}`}>
                  <div className="gcal-day-name">{dayStr}</div>
                  <div className={`gcal-day-number ${active ? 'active-pill' : ''}`}>
                    {dateNum}
                  </div>

                  {/* All-Day Events Banner Area */}
                  <div className="gcal-allday-container">
                    {allDayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="gcal-allday-badge"
                        style={{ backgroundColor: evt.color || '#00ba58' }}
                        onClick={(e) => handleEventClick(evt, e)}
                        title={`${evt.title} (All day)`}
                      >
                        {evt.title}
                      </div>
                    ))}
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
              {displayedDays.map((d, dayIndex) => {
                const dateKey = d.toISOString().split('T')[0];
                const active = isToday(d);

                // Filter non-all-day events for this specific day
                const dayEvents = events.filter(
                  (e) =>
                    !e.allDay &&
                    e.date === dateKey &&
                    (searchQuery
                      ? e.title.toLowerCase().includes(searchQuery.toLowerCase())
                      : true)
                );

                return (
                  <div key={dayIndex} className="gcal-grid-day-col">
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
                          top: `${(15 * 60 + 20) * (60 / 60)}px`, // ~3:20 PM
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
                      const topPx = (startMin / 60) * 60; // 60px per hour
                      const heightPx = Math.max(26, (duration / 60) * 60 - 2);

                      return (
                        <div
                          key={evt.id}
                          className="gcal-event-card"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            backgroundColor: evt.color || '#0288d1',
                          }}
                          onClick={(e) => handleEventClick(evt, e)}
                          title={`${evt.title} (${evt.startTime} - ${evt.endTime})`}
                        >
                          <div className="gcal-event-card-title">{evt.title}</div>
                          <div className="gcal-event-card-time">
                            {evt.startTime} – {evt.endTime}
                          </div>
                          {evt.location && (
                            <div className="gcal-event-card-sub">{evt.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button (FAB) for Mobile Quick Add */}
      <button
        type="button"
        className="gcal-fab-btn"
        onClick={() => {
          setSelectedEvent(null);
          setModalOpen(true);
        }}
        title="Add Event"
        aria-label="Add Event"
      >
        <svg width="24" height="24" viewBox="0 0 36 36">
          <path fill="#4285F4" d="M16 16v14h4V16h14v-4H20V-2h-4v14H2v4h14z" />
          <path fill="#34A853" d="M30 16H20l-4-4h14z" />
          <path fill="#FBBC05" d="M16 30V20l4-4v14z" />
          <path fill="#EA4335" d="M2 16h14l4 4H2z" />
        </svg>
      </button>

      {/* Google Calendar Style Event Creation & Editing Modal */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={selectedEvent}
        userName={employee?.name || 'Mark Vincent Madrid'}
      />
    </div>
  );
}
