'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookmarkSimple,
  Users,
  TextAlignLeft,
  NotePencil,
  Trash,
  PencilSimple,
  DotsThreeVertical,
} from '@phosphor-icons/react/dist/ssr';
import { CalendarEvent } from '@/components/events/EventModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface ConflictEventsModalProps {
  isOpen: boolean;
  events: CalendarEvent[];
  onClose: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

export function ConflictEventsModal({
  isOpen,
  events,
  onClose,
  onEditEvent,
  onDeleteEvent,
}: ConflictEventsModalProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeMenuEventId, setActiveMenuEventId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 80) {
      onClose();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    setIsDragging(true);
    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = ev.clientY - dragStartY.current;
      if (delta > 0) setDragOffset(delta);
    };
    const onMouseUp = () => {
      setIsDragging(false);
      if (dragOffset > 80) onClose();
      else setDragOffset(0);
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Close 3-dot popover when clicking anywhere else
  useEffect(() => {
    const handleDocumentClick = () => setActiveMenuEventId(null);
    if (activeMenuEventId) {
      document.addEventListener('click', handleDocumentClick);
      return () => document.removeEventListener('click', handleDocumentClick);
    }
  }, [activeMenuEventId]);

  if (!isOpen || events.length === 0) return null;

  const eventToDelete = events.find((e) => e.id === deleteConfirmId);

  return (
    <>
      <div
        className="portal-modal-backdrop gcal-modal-backdrop-mobile"
        onClick={onClose}
        role="presentation"
        style={{ zIndex: 99990 }}
      >
        <div
          className="portal-modal-card gcal-portal-modal-card gcal-drawer-card gcal-conflict-modal-card"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuEventId(null);
          }}
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: '#ffffff',
            background: '#ffffff',
            transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Mobile Draggable Handle Zone for Drawer */}
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

          {/* Header (No top-right X button, Medium font weight) */}
          <div
            className="discord-modal-header"
            style={{
              padding: '18px 24px 8px 24px',
              backgroundColor: '#ffffff',
              borderBottom: 'none',
            }}
          >
            <h2
              className="discord-modal-title gcal-conflict-modal-title"
              style={{
                fontSize: '18px',
                fontFamily: "var(--font-geist), 'Geist', sans-serif",
                fontWeight: 500,
                color: '#dc2626',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {events.length} Overlapping Events
            </h2>
          </div>

          {/* Description with Bottom Separator Line */}
          <div style={{ padding: '0 24px' }}>
            <p
              style={{
                margin: 0,
                paddingBottom: '14px',
                fontSize: '13px',
                fontFamily: "var(--font-body), sans-serif",
                color: 'var(--color-text-tertiary, #716761)',
                borderBottom: '1px solid var(--color-border-default, #ede8e3)',
              }}
            >
              These events share overlapping schedules on this date. Click an event to edit or reschedule it.
            </p>
          </div>

          {/* Events List */}
          <div
            className="gcal-conflict-events-list"
            style={{
              overflowY: 'auto',
              padding: '12px 24px 16px 24px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {events.map((evt, idx) => {
              const fullDateStr = formatFullDate(evt.date);
              const startTimeStr = formatDisplayTime(evt.startTime);
              const endTimeStr = formatDisplayTime(evt.endTime);
              const timeRange = evt.allDay ? 'All day' : `${startTimeStr} – ${endTimeStr}`;
              const isLast = idx === events.length - 1;
              const isMenuOpen = activeMenuEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  className="gcal-conflict-item-card"
                  onClick={() => onEditEvent(evt)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    padding: '8px 0 14px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--color-border-default, #ede8e3)',
                    marginBottom: isLast ? '0' : '8px',
                    cursor: 'pointer',
                  }}
                >
                  {/* Top: Title (Geist Medium) & 3-Dot Menu */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontFamily: "var(--font-geist), 'Geist', sans-serif",
                        fontWeight: 500,
                        color: 'var(--color-text-primary, #171412)',
                      }}
                    >
                      {evt.title || '(Untitled Event)'}
                    </span>

                    {/* 3-Dot Action Menu */}
                    <div
                      style={{ position: 'relative' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={{
                          background: isMenuOpen ? '#f3ede7' : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px',
                          color: '#716761',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.15s ease',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuEventId((prev) => (prev === evt.id ? null : evt.id));
                        }}
                        title="Event actions"
                        aria-label="Event actions"
                      >
                        <DotsThreeVertical size={18} weight="bold" />
                      </button>

                      {/* Dropdown Popover */}
                      {isMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            right: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--color-border-default, #e9ddd7)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.04)',
                            padding: '4px',
                            minWidth: '130px',
                            zIndex: 999999,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 10px',
                              fontSize: '13px',
                              fontWeight: 500,
                              fontFamily: "var(--font-geist), sans-serif",
                              color: 'var(--color-text-primary, #171412)',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background-color 0.12s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f3ee'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              setActiveMenuEventId(null);
                              onEditEvent(evt);
                            }}
                          >
                            <PencilSimple size={14} weight="bold" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 10px',
                              fontSize: '13px',
                              fontWeight: 500,
                              fontFamily: "var(--font-geist), sans-serif",
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background-color 0.12s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              setActiveMenuEventId(null);
                              setDeleteConfirmId(evt.id);
                            }}
                          >
                            <Trash size={14} weight="bold" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Body (Matching Description Text Color: #716761) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {/* Time / Date Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BookmarkSimple size={16} weight="regular" style={{ color: 'var(--color-text-tertiary, #716761)', flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontFamily: "var(--font-body), sans-serif",
                          fontWeight: 400,
                          color: 'var(--color-text-tertiary, #716761)',
                        }}
                      >
                        {fullDateStr} &nbsp;{timeRange}
                      </span>
                    </div>

                    {/* Guests Row */}
                    {evt.guests && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={16} weight="regular" style={{ color: 'var(--color-text-tertiary, #716761)', flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontFamily: "var(--font-body), sans-serif",
                            fontWeight: 400,
                            color: 'var(--color-text-tertiary, #716761)',
                          }}
                        >
                          {evt.guests}
                        </span>
                      </div>
                    )}

                    {/* Description Row */}
                    {evt.description && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TextAlignLeft size={16} weight="regular" style={{ color: 'var(--color-text-tertiary, #716761)', flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontFamily: "var(--font-body), sans-serif",
                            fontWeight: 400,
                            color: 'var(--color-text-tertiary, #716761)',
                          }}
                        >
                          {evt.description}
                        </span>
                      </div>
                    )}

                    {/* Remarks Row */}
                    {evt.remarks && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <NotePencil size={16} weight="regular" style={{ color: 'var(--color-text-tertiary, #716761)', flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontFamily: "var(--font-body), sans-serif",
                            fontWeight: 400,
                            color: 'var(--color-text-tertiary, #716761)',
                          }}
                        >
                          {evt.remarks}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Separator */}
          <div className="discord-modal-separator" />

          {/* Modal Footer using standard discord-modal-footer and discord-modal-btn-cancel */}
          <div className="discord-modal-footer">
            <button
              type="button"
              className="discord-modal-btn discord-modal-btn-cancel"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Deletion within Conflict List (High z-index to always render on top) */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${eventToDelete?.title || 'this event'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        zIndex={100005}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteEvent(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
      />
    </>
  );
}
