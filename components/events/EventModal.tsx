'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  VideoCamera,
  MapPin,
  TextAlignLeft,
  CalendarBlank,
  X,
  Trash,
  CaretDown,
} from '@phosphor-icons/react/dist/ssr';
import { Tooltip } from '@/components/ui/Tooltip';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "03:30" or "09:00"
  endTime: string; // e.g. "04:30" or "10:00"
  allDay?: boolean;
  repeat?: string;
  guests?: string;
  hasMeet?: boolean;
  location?: string;
  description?: string;
  color?: string;
}

const COLOR_PALETTE = [
  { name: 'Peacock Blue', value: '#0288d1' },
  { name: 'Basil Green', value: '#00ba58' },
  { name: 'Grape Purple', value: '#7b1fa2' },
  { name: 'Tangerine Orange', value: '#e65100' },
  { name: 'Flamingo Red', value: '#d32f2f' },
  { name: 'Sage Teal', value: '#00897b' },
  { name: 'Banana Yellow', value: '#f59e0b' },
  { name: 'Graphite Gray', value: '#616161' },
];

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  initialEvent?: Partial<CalendarEvent> | null;
  userName?: string;
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  userName = 'Mark Vincent Madrid',
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState('Does not repeat');
  const [guests, setGuests] = useState('');
  const [hasMeet, setHasMeet] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0288d1');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDate(initialEvent.date || new Date().toISOString().split('T')[0]);
      setStartTime(initialEvent.startTime || '09:00');
      setEndTime(initialEvent.endTime || '10:00');
      setAllDay(initialEvent.allDay || false);
      setRepeat(initialEvent.repeat || 'Does not repeat');
      setGuests(initialEvent.guests || '');
      setHasMeet(initialEvent.hasMeet || false);
      setLocation(initialEvent.location || '');
      setDescription(initialEvent.description || '');
      setColor(initialEvent.color || '#0288d1');
    } else {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setRepeat('Does not repeat');
      setGuests('');
      setHasMeet(false);
      setLocation('');
      setDescription('');
      setColor('#0288d1');
    }
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventToSave: CalendarEvent = {
      id: initialEvent?.id || `evt-${Date.now()}`,
      title: title.trim() || '(No title)',
      date,
      startTime,
      endTime,
      allDay,
      repeat,
      guests: guests.trim(),
      hasMeet,
      location: location.trim(),
      description: description.trim(),
      color,
    };
    onSave(eventToSave);
    onClose();
  };

  // Format date display for header/date button
  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="gcal-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="gcal-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-event-title"
      >
        {/* Top Header bar with Drag Handle & Close button */}
        <div className="gcal-modal-header">
          <div className="gcal-drag-handle" title="Drag">
            <span className="gcal-drag-line" />
            <span className="gcal-drag-line" />
          </div>

          <div className="gcal-header-actions">
            {initialEvent?.id && onDelete && (
              <Tooltip content="Delete event" position="bottom">
                <button
                  type="button"
                  className="gcal-header-btn danger"
                  onClick={() => {
                    onDelete(initialEvent.id!);
                    onClose();
                  }}
                  aria-label="Delete event"
                >
                  <Trash size={18} weight="bold" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Close" position="bottom">
              <button
                type="button"
                className="gcal-header-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </Tooltip>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="gcal-modal-form">
          {/* Title Input with blue underline */}
          <div className="gcal-title-wrapper">
            <input
              type="text"
              id="gcal-event-title"
              className="gcal-title-input"
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="gcal-form-body">
            {/* Time / Date Section */}
            <div className="gcal-form-row">
              <Clock size={20} weight="regular" className="gcal-row-icon" />
              <div className="gcal-row-content">
                <div className="gcal-datetime-pills">
                  <input
                    type="date"
                    className="gcal-pill-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />

                  {!allDay && (
                    <div className="gcal-time-range-group">
                      <input
                        type="time"
                        className="gcal-pill-input time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                      <span className="gcal-time-sep">–</span>
                      <input
                        type="time"
                        className="gcal-pill-input time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="gcal-datetime-options">
                  <label className="gcal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                    />
                    <span>All day</span>
                  </label>

                  <span className="gcal-meta-link">Time zone (GMT+08)</span>
                </div>

                <div className="gcal-repeat-dropdown-wrap">
                  <select
                    className="gcal-repeat-select"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                  >
                    <option value="Does not repeat">Does not repeat</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Guests Section */}
            <div className="gcal-form-row">
              <Users size={20} weight="regular" className="gcal-row-icon" />
              <div className="gcal-row-content">
                <input
                  type="text"
                  className="gcal-inline-input"
                  placeholder="Add guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                />
              </div>
            </div>

            {/* Video Conferencing */}
            <div className="gcal-form-row">
              <div className="gcal-meet-icon-box">
                <VideoCamera size={20} weight="fill" className="gcal-meet-icon" />
              </div>
              <div className="gcal-row-content">
                <button
                  type="button"
                  className={`gcal-meet-btn ${hasMeet ? 'active' : ''}`}
                  onClick={() => setHasMeet(!hasMeet)}
                >
                  {hasMeet ? 'Google Meet video conferencing added' : 'Add Google Meet video conferencing'}
                </button>
              </div>
            </div>

            {/* Location Section */}
            <div className="gcal-form-row">
              <MapPin size={20} weight="regular" className="gcal-row-icon" />
              <div className="gcal-row-content">
                <input
                  type="text"
                  className="gcal-inline-input"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Description Section */}
            <div className="gcal-form-row">
              <TextAlignLeft size={20} weight="regular" className="gcal-row-icon" />
              <div className="gcal-row-content">
                <textarea
                  className="gcal-inline-textarea"
                  placeholder="Add description or attachment"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Calendar Owner & Color Section */}
            <div className="gcal-form-row">
              <CalendarBlank size={20} weight="regular" className="gcal-row-icon" />
              <div className="gcal-row-content">
                <div className="gcal-owner-info-group">
                  <div className="gcal-owner-header">
                    <span className="gcal-owner-name">{userName}</span>
                    <div className="gcal-color-dot-wrapper">
                      <button
                        type="button"
                        className="gcal-color-dot"
                        style={{ backgroundColor: color }}
                        onClick={() => setColorPickerOpen(!colorPickerOpen)}
                        title="Pick event color"
                      />
                      {colorPickerOpen && (
                        <div className="gcal-color-popover">
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              className={`gcal-palette-dot ${color === c.value ? 'active' : ''}`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                              onClick={() => {
                                setColor(c.value);
                                setColorPickerOpen(false);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="gcal-owner-sub">
                    Busy • Default visibility • Notify 30 minutes before
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="gcal-modal-footer">
            <button
              type="button"
              className="gcal-more-options-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="gcal-save-btn">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
