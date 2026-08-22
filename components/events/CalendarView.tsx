'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CaretLeft,
  CaretRight,
  Plus,
  Clock,
  Trash,
  X,
  Star,
} from '@phosphor-icons/react/dist/ssr';
import { EventModal, CalendarEvent, getEventPastelPalette } from '@/components/events/EventModal';
import { ConflictEventsModal } from '@/components/events/ConflictEventsModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getTodayKey = (d: Date = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getMonthRange = (d: Date) => {
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  return {
    monthKey,
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
  };
};

const isPastEvent = (eventDate: string, eventEndTime: string) => {
  const now = new Date();
  const todayKey = getTodayKey(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (eventDate < todayKey) return true;
  if (eventDate === todayKey && eventEndTime <= currentTime) return true;
  return false;
};

interface CalendarViewProps {
  userName?: string;
  onBack?: () => void;
}

interface DbCalendarEvent {
  id: string;
  user_id?: string | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  guests?: string | string[] | null;
  description?: string;
  remarks?: string;
}

function mapDbToCalendarEvent(row: DbCalendarEvent): CalendarEvent {
  const guestsFormatted = Array.isArray(row.guests)
    ? row.guests.filter(Boolean).join(', ')
    : (row.guests || '');

  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    allDay: row.all_day,
    guests: guestsFormatted,
    description: row.description || '',
    remarks: row.remarks || '',
  };
}

export interface EventCluster {
  id: string;
  isConflict: boolean;
  events: CalendarEvent[];
  startMin: number;
  endMin: number;
}

function timeStringToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function clusterDayEvents(dayEvents: CalendarEvent[]): EventCluster[] {
  if (!dayEvents || dayEvents.length === 0) return [];

  const timedEvents = dayEvents.filter((e) => !e.allDay);
  if (timedEvents.length === 0) return [];

  const sorted = [...timedEvents].sort((a, b) => {
    const aStart = timeStringToMinutes(a.startTime);
    const bStart = timeStringToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = timeStringToMinutes(a.endTime);
    const bEnd = timeStringToMinutes(b.endTime);
    return (bEnd - bStart) - (aEnd - aStart);
  });

  const clusters: EventCluster[] = [];

  for (const evt of sorted) {
    const startMin = timeStringToMinutes(evt.startTime);
    const endMin = Math.max(startMin + 30, timeStringToMinutes(evt.endTime));

    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster && startMin < lastCluster.endMin) {
      lastCluster.events.push(evt);
      lastCluster.endMin = Math.max(lastCluster.endMin, endMin);
      lastCluster.isConflict = true;
    } else {
      clusters.push({
        id: `cluster-${evt.id}`,
        isConflict: false,
        events: [evt],
        startMin,
        endMin,
      });
    }
  }

  return clusters;
}

export function CalendarView({ userName = 'Mark Vincent Madrid', onBack }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
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
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictModalEvents, setConflictModalEvents] = useState<CalendarEvent[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [mobileDeleteEventId, setMobileDeleteEventId] = useState<string | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const { employee } = useAuth() || {};
  const supabase = createClient();

  const handleTouchStartCard = (evtId: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setMobileDeleteEventId((prev) => (prev === evtId ? null : evtId));
    }, 450);
  };

  const handleTouchEndCard = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (evt: CalendarEvent, e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    handleEventClick(evt, e);
  };

  useEffect(() => {
    // Desktop grid auto-scroll to current time
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = Math.max(0, currentMins - 120);
    }
    // Mobile schedule feed auto-scroll directly into Today row
    const timer = setTimeout(() => {
      const todayKey = getTodayKey();
      const todayElem = document.getElementById(`mobile-day-row-${todayKey}`);
      if (todayElem) {
        todayElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const loadedMonthsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const { monthKey, startDate, endDate } = getMonthRange(currentDate);

    if (!loadedMonthsRef.current.has(monthKey)) {
      async function loadMonthEvents() {
        try {
          const res = await fetch(`/api/events?start_date=${startDate}&end_date=${endDate}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              if (isMounted) {
                const mapped = json.data.map((d: DbCalendarEvent) => mapDbToCalendarEvent(d));
                setEvents((prev) => {
                  const map = new Map(prev.map((e) => [e.id, e]));
                  mapped.forEach((e: CalendarEvent) => map.set(e.id, e));
                  const next = Array.from(map.values());
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('sacli_user_events', JSON.stringify(next));
                  }
                  return next;
                });
                loadedMonthsRef.current.add(monthKey);
                return;
              }
            }
          }
        } catch (err) {
          console.error('Error loading month events from /api/events:', err);
        }

        try {
          const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

          if (!error && data) {
            if (isMounted) {
              const mapped = data.map((d: DbCalendarEvent) => mapDbToCalendarEvent(d));
              setEvents((prev) => {
                const map = new Map(prev.map((e) => [e.id, e]));
                mapped.forEach((e: CalendarEvent) => map.set(e.id, e));
                const next = Array.from(map.values());
                if (typeof window !== 'undefined') {
                  localStorage.setItem('sacli_user_events', JSON.stringify(next));
                }
                return next;
              });
              loadedMonthsRef.current.add(monthKey);
            }
          }
        } catch (err) {
          console.error('Error loading month events from Supabase:', err);
        }
      }

      loadMonthEvents();
    }

    return () => {
      isMounted = false;
    };
  }, [currentDate, supabase]);

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase
      .channel('public:calendar_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEvt = mapDbToCalendarEvent(payload.new as DbCalendarEvent);
            setEvents((prev) => {
              const exists = prev.some((e) => e.id === newEvt.id);
              const next = exists ? prev.map((e) => (e.id === newEvt.id ? newEvt : e)) : [...prev, newEvt];
              if (typeof window !== 'undefined') {
                localStorage.setItem('sacli_user_events', JSON.stringify(next));
              }
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedEvt = mapDbToCalendarEvent(payload.new as DbCalendarEvent);
            setEvents((prev) => {
              const next = prev.map((e) => (e.id === updatedEvt.id ? updatedEvt : e));
              if (typeof window !== 'undefined') {
                localStorage.setItem('sacli_user_events', JSON.stringify(next));
              }
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setEvents((prev) => {
              const next = prev.filter((e) => e.id !== deletedId);
              if (typeof window !== 'undefined') {
                localStorage.setItem('sacli_user_events', JSON.stringify(next));
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleSaveEvent = async (eventToSave: CalendarEvent) => {
    const isExisting = events.some((e) => e.id === eventToSave.id);
    const updatedLocal = isExisting
      ? events.map((e) => (e.id === eventToSave.id ? eventToSave : e))
      : [...events, eventToSave];

    setEvents(updatedLocal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sacli_user_events', JSON.stringify(updatedLocal));
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventToSave.id,
          title: eventToSave.title,
          date: eventToSave.date,
          startTime: eventToSave.startTime,
          endTime: eventToSave.endTime,
          allDay: eventToSave.allDay || false,
          guests: eventToSave.guests || '',
          description: eventToSave.description || '',
          remarks: eventToSave.remarks || '',
          userId: employee?.id || null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const savedEvt = mapDbToCalendarEvent(json.data as DbCalendarEvent);
          setEvents((prev) => {
            const next = prev.map((e) => (e.id === eventToSave.id ? savedEvt : e));
            if (typeof window !== 'undefined') {
              localStorage.setItem('sacli_user_events', JSON.stringify(next));
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Error saving event via API:', err);
    }
  };

  const confirmDeleteEvent = (eventId: string) => {
    setEventToDeleteId(eventId);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteEvent = async () => {
    if (!eventToDeleteId) return;
    const eventId = eventToDeleteId;
    await executeDeleteEventDirect(eventId);
    setDeleteConfirmOpen(false);
    setEventToDeleteId(null);
    setModalOpen(false);
  };

  const executeDeleteEventDirect = async (eventId: string) => {
    const updatedLocal = events.filter((e) => e.id !== eventId);
    setEvents(updatedLocal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sacli_user_events', JSON.stringify(updatedLocal));
    }

    try {
      await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting event via API:', err);
    }
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

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
  };

  const weekDays = getWeekDays(currentDate);
  const monthDays = getMonthDays(currentDate);

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

  const navigatePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const navigateNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const navigateToday = () => {
    const now = new Date();
    setCurrentDate(now);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTo({
        top: Math.max(0, currentMins - 120),
        behavior: 'smooth',
      });
    }
    setTimeout(() => {
      const todayKey = getTodayKey(now);
      const todayElem = document.getElementById(`mobile-day-row-${todayKey}`);
      if (todayElem) {
        todayElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleSlotClick = (dateStr: string, hour: number) => {
    const now = new Date();
    const todayKey = getTodayKey(now);
    const currentHour = now.getHours();
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

  const handleConflictClick = (conflictEvents: CalendarEvent[], e: React.MouseEvent) => {
    e.stopPropagation();
    setConflictModalEvents(conflictEvents);
    setConflictModalOpen(true);
  };

  return (
    <div className="gcal-embedded-container">
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
        <div className="gcal-mobile-nav-group">
          <Tooltip content="Previous Month" position="bottom">
            <button
              type="button"
              className="gcal-arrow-btn"
              onClick={navigatePrevMonth}
              aria-label="Previous month"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
          </Tooltip>

          <h2 className="gcal-month-title">{formatMonthYear(currentDate)}</h2>

          <Tooltip content="Next Month" position="bottom">
            <button
              type="button"
              className="gcal-arrow-btn"
              onClick={navigateNextMonth}
              aria-label="Next month"
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
      <div className="gcal-calendar-viewport">
        <div className="gcal-mobile-schedule-feed">
          {monthDays.map((d) => {
            const dateKey = getTodayKey(d);
            const active = isToday(d);
            const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateNum = d.getDate();

            const dayEvents = events.filter((e) => e.date === dateKey);

            return (
              <div
                key={dateKey}
                id={`mobile-day-row-${dateKey}`}
                className={`gcal-mobile-day-row ${active ? 'is-today' : ''}`}
              >
                <div className="gcal-mobile-date-col">
                  <span className={`gcal-mobile-weekday-name ${active ? 'is-today' : ''}`}>{dayStr}</span>
                  <span className={`gcal-mobile-date-pill ${active ? 'is-today' : ''}`}>{dateNum}</span>
                </div>

                <div className="gcal-mobile-events-stack">
                  {(() => {
                    const allDayEvents = dayEvents.filter((e) => e.allDay);
                    const timedClusters = clusterDayEvents(dayEvents);

                    return (
                      <>
                        {allDayEvents.map((evt) => {
                          const palette = getEventPastelPalette(evt);
                          const isPast = isPastEvent(evt.date, evt.endTime);
                          const isDeleteActive = mobileDeleteEventId === evt.id;

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
                              onTouchStart={() => handleTouchStartCard(evt.id)}
                              onTouchEnd={handleTouchEndCard}
                              onMouseDown={() => handleTouchStartCard(evt.id)}
                              onMouseUp={handleTouchEndCard}
                              onClick={(e) => handleCardClick(evt, e)}
                            >
                              <div className="gcal-mobile-event-content">
                                <div className="gcal-mobile-event-title" style={{ color: palette.text }}>
                                  {evt.title}
                                </div>
                                <div className="gcal-mobile-event-time" style={{ color: palette.subText }}>
                                  <Clock size={13} weight="regular" />
                                  <span>All day</span>
                                </div>
                              </div>

                              {isDeleteActive && (
                                <button
                                  type="button"
                                  className="gcal-mobile-delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteEvent(evt.id);
                                  }}
                                  aria-label="Delete event"
                                >
                                  <Trash size={15} weight="bold" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {timedClusters.map((cluster) => {
                          if (cluster.events.length === 1) {
                            const evt = cluster.events[0];
                            const palette = getEventPastelPalette(evt);
                            const isPast = isPastEvent(evt.date, evt.endTime);
                            const isDeleteActive = mobileDeleteEventId === evt.id;

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
                                onTouchStart={() => handleTouchStartCard(evt.id)}
                                onTouchEnd={handleTouchEndCard}
                                onMouseDown={() => handleTouchStartCard(evt.id)}
                                onMouseUp={handleTouchEndCard}
                                onClick={(e) => handleCardClick(evt, e)}
                              >
                                <div className="gcal-mobile-event-content">
                                  <div className="gcal-mobile-event-title" style={{ color: palette.text }}>
                                    {evt.title}
                                  </div>
                                  <div className="gcal-mobile-event-time" style={{ color: palette.subText }}>
                                    <Clock size={13} weight="regular" />
                                    <span>{`${evt.startTime} – ${evt.endTime}`}</span>
                                  </div>
                                </div>

                                {isDeleteActive && (
                                  <button
                                    type="button"
                                    className="gcal-mobile-delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDeleteEvent(evt.id);
                                    }}
                                    aria-label="Delete event"
                                  >
                                    <Trash size={15} weight="bold" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={cluster.id}
                              className="gcal-mobile-event-card gcal-conflict-card"
                              onClick={(e) => handleConflictClick(cluster.events, e)}
                            >
                              <div className="gcal-mobile-event-content">
                                <div className="gcal-conflict-card-title">
                                  {cluster.events.length} Overlapping Meetings
                                </div>
                                <div className="gcal-conflict-card-subtitle">
                                  Multiple meetings scheduled...
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                  <button
                    type="button"
                    className="gcal-mobile-empty-slot"
                    onClick={() => handleSlotClick(dateKey, 16)}
                    aria-label="Add event on this date"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="gcal-desktop-grid-view">
          <div className="gcal-days-header-row">
            <div className="gcal-timezone-corner" />

            <div className="gcal-days-columns-header">
              {weekDays.map((d, index) => {
                const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dateNum = d.getDate();
                const active = isToday(d);
                const dateKey = getTodayKey(d);
                const dayAllDayEvents = events.filter((e) => e.date === dateKey && e.allDay);

                return (
                  <div key={index} className={`gcal-day-header-cell ${active ? 'is-today' : ''}`} style={{ position: 'relative' }}>
                    {events.filter((e) => e.date === dateKey).length > 0 && (
                      <span className="gcal-date-event-count">
                        {events.filter((e) => e.date === dateKey).length}
                      </span>
                    )}
                    <div className="gcal-day-name">{dayStr}</div>
                    <div className={`gcal-day-number ${active ? 'active-pill' : ''}`}>
                      {dateNum}
                    </div>
                    {dayAllDayEvents.length > 0 && (() => {
                      const allDayPalette = getEventPastelPalette(dayAllDayEvents[0]);
                      return (
                        <div className="gcal-allday-bookmark-wrap">
                          <Tooltip
                            content={`All-day: ${dayAllDayEvents.map((e) => e.title + (e.guests ? ` (${e.guests})` : '')).join('; ')}`}
                            position="bottom"
                          >
                            <svg
                              width="12"
                              height="16"
                              viewBox="0 0 12 16"
                              fill={allDayPalette.text}
                              xmlns="http://www.w3.org/2000/svg"
                              className="gcal-allday-bookmark-ribbon"
                            >
                              <path d="M0 0H12V16L6 11.5L0 16V0Z" />
                            </svg>
                          </Tooltip>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="gcal-grid-scroll" ref={gridScrollRef}>
            <div className="gcal-grid-body">
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
              <div className="gcal-grid-days-container">
                {weekDays.map((d, dayIndex) => {
                  const dateKey = getTodayKey(d);
                  const active = isToday(d);
                  const now = new Date();
                  const todayKey = getTodayKey(now);
                  const currentHour = now.getHours();

                  const dayEvents = events.filter((e) => e.date === dateKey);

                  return (
                    <div key={dayIndex} className={`gcal-grid-day-col ${active ? 'is-today' : ''}`}>
                      {HOURS.map((hour) => {
                        const isPastHour = dateKey < todayKey || (dateKey === todayKey && hour < currentHour);
                        return (
                          <div
                            key={hour}
                            className={`gcal-hour-cell ${isPastHour ? 'is-past-cell' : ''}`}
                            onClick={() => !isPastHour && handleSlotClick(dateKey, hour)}
                          />
                        );
                      })}
                      {active && (
                        <div
                          className="gcal-current-time-indicator"
                          style={{
                            top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * (60 / 60)}px`,
                          }}
                        >
                          <div className="gcal-time-dot" />
                          <div className="gcal-time-line" />
                        </div>
                      )}
                      {(() => {
                        const clusters = clusterDayEvents(dayEvents);
                        return clusters.map((cluster) => {
                          if (cluster.events.length === 1) {
                            const evt = cluster.events[0];
                            const startMin = timeStringToMinutes(evt.startTime);
                            const endMin = timeStringToMinutes(evt.endTime);
                            const duration = Math.max(30, endMin - startMin);
                            const topPx = (startMin / 60) * 60;
                            const heightPx = (duration / 60) * 60;

                            const palette = getEventPastelPalette(evt);
                            const isPast = isPastEvent(evt.date, evt.endTime);
                            const timeDisplay = `${evt.startTime} – ${evt.endTime}`;

                            return (
                              <div
                                key={evt.id}
                                className="gcal-event-tooltip-container"
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                              >
                                <div
                                  className={`gcal-event-card ${isPast ? 'is-past-slashed' : ''}`}
                                  style={{
                                    height: `${heightPx}px`,
                                    background: isPast
                                      ? `repeating-linear-gradient(135deg, ${palette.stripe} 0px, ${palette.stripe} 1.5px, transparent 1.5px, transparent 6px), linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`
                                      : `linear-gradient(180deg, ${palette.bgLight} 0%, ${palette.bgDark} 100%)`,
                                    borderColor: palette.border,
                                    color: palette.text,
                                  }}
                                  onClick={(e) => handleEventClick(evt, e)}
                                >
                                  <div className="gcal-event-card-top-row">
                                    <div className="gcal-event-card-title" style={{ color: palette.text, fontWeight: 600 }}>
                                      {evt.title}
                                    </div>
                                    <Tooltip content="Delete event" position="top">
                                      <button
                                        type="button"
                                        className="gcal-event-card-delete-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmDeleteEvent(evt.id);
                                        }}
                                        aria-label="Delete event"
                                      >
                                        <Trash size={12} weight="bold" />
                                      </button>
                                    </Tooltip>
                                  </div>
                                  <div className="gcal-event-card-time" style={{ color: palette.subText, fontWeight: 500 }}>
                                    <Clock size={12} weight="regular" />
                                    <span>
                                      {timeDisplay}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          const topPx = (cluster.startMin / 60) * 60;
                          const heightPx = Math.max(48, ((cluster.endMin - cluster.startMin) / 60) * 60);

                          return (
                            <div
                              key={cluster.id}
                              className="gcal-event-tooltip-container"
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                              }}
                            >
                              <div
                                className="gcal-event-card gcal-conflict-card"
                                style={{ height: `${heightPx}px` }}
                                onClick={(e) => handleConflictClick(cluster.events, e)}
                              >
                                <div className="gcal-event-card-top-row">
                                  <div className="gcal-conflict-card-title">
                                    {cluster.events.length} Overlapping Meetings
                                  </div>
                                </div>
                                <div className="gcal-conflict-card-subtitle">
                                  Multiple meetings scheduled...
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={confirmDeleteEvent}
        initialEvent={selectedEvent}
        userName={userName}
        existingEvents={events}
      />

      {/* Overlapping Events Conflict Modal */}
      <ConflictEventsModal
        isOpen={conflictModalOpen}
        events={conflictModalEvents}
        onClose={() => setConflictModalOpen(false)}
        onEditEvent={(evt) => {
          setConflictModalOpen(false);
          setSelectedEvent(evt);
          setModalOpen(true);
        }}
        onDeleteEvent={(evtId) => {
          executeDeleteEventDirect(evtId);
          setConflictModalEvents((prev) => {
            const next = prev.filter((e) => e.id !== evtId);
            if (next.length <= 1) {
              setConflictModalOpen(false);
            }
            return next;
          });
        }}
      />

      {/* Delete Event Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={executeDeleteEvent}
      />
    </div>
  );
}
