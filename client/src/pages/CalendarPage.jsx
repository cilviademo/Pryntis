import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EVENT_TYPES = [
  { key: 'mixing', label: 'Mixing Session', color: '#0066FF' },
  { key: 'mastering', label: 'Mastering Session', color: '#6A00FF' },
  { key: 'meeting', label: 'Artist Meeting', color: '#0066FF' },
  { key: 'release', label: 'Release Deadline', color: '#E10600' },
  { key: 'metadata', label: 'Metadata/Rights Deadline', color: '#FFB000' },
  { key: 'followup', label: 'Placement Follow-up', color: '#00FF84' },
  { key: 'legal', label: 'Legal/Template Review', color: '#00FF84' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper functions
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatTime(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// Generate demo events for the current month + surrounding
function generateDemoEvents(year, month) {
  const events = [];
  const base = new Date(year, month, 1);

  const demoData = [
    { day: 3, hour: 10, type: 'mixing', title: 'Mix Session - Velvet Underground EP', linked: 'Project: Velvet Underground EP' },
    { day: 5, hour: 14, type: 'meeting', title: 'A&R Check-in - Nova Sinclair', linked: 'Artist: Nova Sinclair' },
    { day: 7, hour: 9, type: 'mastering', title: 'Master Session - Midnight Run', linked: 'Asset: Midnight Run' },
    { day: 8, hour: 11, type: 'followup', title: 'Follow-up: Netflix Sync Placement', linked: 'Placement: Netflix sync' },
    { day: 10, hour: 15, type: 'metadata', title: 'ISRC Assignment Deadline', linked: 'Template: ISRC/UPC SOP' },
    { day: 12, hour: 10, type: 'mixing', title: 'Vocal Comp Session - Rio Lark', linked: 'Artist: Rio Lark' },
    { day: 14, hour: 13, type: 'legal', title: 'Review: Producer Agreement - DJ Phantom', linked: 'Template: Producer Agreement' },
    { day: 15, hour: 16, type: 'release', title: 'RELEASE: Nova Sinclair - "Echoes"', linked: 'Project: Echoes Single' },
    { day: 17, hour: 11, type: 'meeting', title: 'Quarterly Royalty Review', linked: 'Template: Royalty Statement' },
    { day: 19, hour: 9, type: 'mastering', title: 'Vinyl Master - Analog Sessions', linked: 'Asset: Analog Sessions' },
    { day: 20, hour: 14, type: 'followup', title: 'Nike Ad Placement Check', linked: 'Placement: Nike Campaign' },
    { day: 22, hour: 10, type: 'mixing', title: 'Mix Revisions - Track 4', linked: 'Project: Rio Lark Album' },
    { day: 24, hour: 15, type: 'metadata', title: 'Catalog Audit - Q1 Metadata', linked: 'Template: Catalog Audit SOP' },
    { day: 26, hour: 13, type: 'legal', title: 'Split Sheet Review - Collab Track', linked: 'Template: Split Sheet' },
    { day: 28, hour: 11, type: 'release', title: 'DSP Delivery Deadline - Rio Lark', linked: 'Template: Release Checklist' },
  ];

  demoData.forEach((d, i) => {
    const maxDay = getDaysInMonth(year, month);
    if (d.day <= maxDay) {
      events.push({
        id: `demo-${month}-${i}`,
        title: d.title,
        date: new Date(year, month, d.day),
        startHour: d.hour,
        startMin: 0,
        endHour: d.hour + 1,
        endMin: 0,
        type: d.type,
        linked: d.linked,
        notes: '',
      });
    }
  });

  return events;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState('month'); // month, week, day
  const [selectedDay, setSelectedDay] = useState(today);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({
    title: '', type: 'meeting', date: '', startHour: '10', startMin: '00',
    endHour: '11', endMin: '00', linked: '', notes: '',
  });
  const [draggedEvent, setDraggedEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load demo events
  useEffect(() => {
    setEvents(generateDemoEvents(year, month));
  }, [year, month]);

  // Upcoming events (next 7 days)
  const upcoming = useMemo(() => {
    const now = new Date();
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    return events
      .filter((e) => e.date >= now && e.date <= weekLater)
      .sort((a, b) => a.date - b.date || a.startHour - b.startHour);
  }, [events]);

  function navigateMonth(delta) {
    setCurrentDate(new Date(year, month + delta, 1));
  }

  function openCreate(date) {
    const d = date || selectedDay;
    setEditingEvent(null);
    setForm({
      title: '', type: 'meeting',
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      startHour: '10', startMin: '00', endHour: '11', endMin: '00',
      linked: '', notes: '',
    });
    setShowModal(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    setForm({
      title: event.title, type: event.type,
      date: `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`,
      startHour: String(event.startHour), startMin: String(event.startMin).padStart(2, '0'),
      endHour: String(event.endHour), endMin: String(event.endMin).padStart(2, '0'),
      linked: event.linked || '', notes: event.notes || '',
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.date) return;
    const [y, m, d] = form.date.split('-').map(Number);
    const newEvent = {
      id: editingEvent ? editingEvent.id : `evt-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      date: new Date(y, m - 1, d),
      startHour: parseInt(form.startHour, 10),
      startMin: parseInt(form.startMin, 10),
      endHour: parseInt(form.endHour, 10),
      endMin: parseInt(form.endMin, 10),
      linked: form.linked,
      notes: form.notes,
    };

    if (editingEvent) {
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? newEvent : e)));
    } else {
      setEvents((prev) => [...prev, newEvent]);
    }
    setShowModal(false);
  }

  function handleDelete(eventId) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedEvent(null);
  }

  // Drag-and-drop handlers for rescheduling
  function handleDragStart(e, event) {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, targetDate) {
    e.preventDefault();
    if (!draggedEvent) return;
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === draggedEvent.id ? { ...ev, date: targetDate } : ev
      )
    );
    setDraggedEvent(null);
  }

  function handleDragEnd() {
    setDraggedEvent(null);
  }

  function getEventType(key) {
    return EVENT_TYPES.find((t) => t.key === key) || EVENT_TYPES[0];
  }

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // --- Month View ---
  function renderMonthView() {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const cells = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      cells.push({ day, currentMonth: false, date: new Date(year, month - 1, day) });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
    }
    // Next month leading
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
    }

    return (
      <div className="cal-month-grid">
        {DAYS.map((d) => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
        {cells.map((cell, idx) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, cell.date));
          const isToday = isSameDay(cell.date, today);
          const isSelected = isSameDay(cell.date, selectedDay);
          const isDragTarget = draggedEvent && !isSameDay(draggedEvent.date, cell.date);
          return (
            <div
              key={idx}
              className={`cal-day-cell${!cell.currentMonth ? ' cal-day-cell--muted' : ''}${isToday ? ' cal-day-cell--today' : ''}${isSelected ? ' cal-day-cell--selected' : ''}`}
              onClick={() => { setSelectedDay(cell.date); if (view === 'month') setView('day'); }}
              onDragOver={isDragTarget ? handleDragOver : undefined}
              onDrop={isDragTarget ? (e) => handleDrop(e, cell.date) : undefined}
              style={isDragTarget ? { outline: '2px dashed var(--color-primary)', outlineOffset: '-2px' } : undefined}
            >
              <span className="cal-day-number">{cell.day}</span>
              <div className="cal-day-events">
                {dayEvents.slice(0, 3).map((ev) => {
                  const et = getEventType(ev.type);
                  return (
                    <div
                      key={ev.id}
                      className="cal-event-chip"
                      style={{ borderLeft: `3px solid ${et.color}`, cursor: 'grab', opacity: draggedEvent?.id === ev.id ? 0.4 : 1 }}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ev); }}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                    >
                      {ev.title.length > 20 ? ev.title.slice(0, 18) + '...' : ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="cal-more">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- Week View ---
  function renderWeekView() {
    const dayOfWeek = selectedDay.getDay();
    const weekStart = new Date(selectedDay);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

    return (
      <div className="cal-week-grid">
        <div className="cal-week-header">
          <div className="cal-week-time-label" />
          {weekDays.map((d, i) => (
            <div
              key={i}
              className={`cal-week-day-label${isSameDay(d, today) ? ' cal-week-day-label--today' : ''}`}
              onClick={() => { setSelectedDay(d); setView('day'); }}
            >
              <span>{DAYS[d.getDay()]}</span>
              <span className="cal-week-day-num">{d.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="cal-week-body">
          {hours.map((h) => (
            <div key={h} className="cal-week-row">
              <div className="cal-week-time">{formatTime(h, 0)}</div>
              {weekDays.map((d, di) => {
                const cellEvents = events.filter(
                  (e) => isSameDay(e.date, d) && e.startHour === h
                );
                return (
                  <div
                    key={di}
                    className="cal-week-cell"
                    onClick={() => { setSelectedDay(d); openCreate(d); }}
                  >
                    {cellEvents.map((ev) => {
                      const et = getEventType(ev.type);
                      return (
                        <div
                          key={ev.id}
                          className="cal-week-event"
                          style={{ background: et.color + '22', borderLeft: `3px solid ${et.color}`, color: et.color }}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        >
                          {ev.title.length > 22 ? ev.title.slice(0, 20) + '...' : ev.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Day View ---
  function renderDayView() {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
    const dayEvents = events.filter((e) => isSameDay(e.date, selectedDay));

    return (
      <div className="cal-day-view">
        <div className="cal-day-view-header">
          <h3>{DAYS[selectedDay.getDay()]}, {MONTHS[selectedDay.getMonth()]} {selectedDay.getDate()}, {selectedDay.getFullYear()}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => openCreate(selectedDay)}>
            + New Event
          </button>
        </div>
        <div className="cal-day-schedule">
          {hours.map((h) => {
            const hourEvents = dayEvents.filter((e) => e.startHour === h);
            return (
              <div key={h} className="cal-day-hour-row">
                <div className="cal-day-hour-label">{formatTime(h, 0)}</div>
                <div className="cal-day-hour-content" onClick={() => openCreate(selectedDay)}>
                  {hourEvents.map((ev) => {
                    const et = getEventType(ev.type);
                    return (
                      <div
                        key={ev.id}
                        className="cal-day-event-block"
                        style={{ background: et.color + '18', borderLeft: `4px solid ${et.color}` }}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{ev.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {formatTime(ev.startHour, ev.startMin)} - {formatTime(ev.endHour, ev.endMin)}
                          {ev.linked && ` | ${ev.linked}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>Calendar</h2>
        <button className="btn btn-primary" onClick={() => openCreate()}>+ New Event</button>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView(v)}
              style={{ textTransform: 'capitalize' }}
            >
              {v}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateMonth(-1)}>Prev</button>
          <span style={{ fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateMonth(1)}>Next</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }}>Today</button>
        </div>
      </div>

      {/* Upcoming panel */}
      {upcoming.length > 0 && view === 'month' && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Upcoming (Next 7 Days)
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {upcoming.slice(0, 5).map((ev) => {
              const et = getEventType(ev.type);
              return (
                <div
                  key={ev.id}
                  className="clickable"
                  style={{ flexShrink: 0, padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${et.color}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', minWidth: '180px', transition: 'box-shadow 150ms ease, border-color 150ms ease' }}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{ev.title.length > 25 ? ev.title.slice(0, 23) + '...' : ev.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {MONTHS[ev.date.getMonth()].slice(0, 3)} {ev.date.getDate()} at {formatTime(ev.startHour, ev.startMin)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Rendering */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Event Details</h3>
              <button className="drawer-close" onClick={() => setSelectedEvent(null)}>x</button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getEventType(selectedEvent.type).color, flexShrink: 0 }} />
                <span className="badge" style={{ background: getEventType(selectedEvent.type).color + '22', color: getEventType(selectedEvent.type).color }}>
                  {getEventType(selectedEvent.type).label}
                </span>
              </div>
              <h3 style={{ marginBottom: '12px' }}>{selectedEvent.title}</h3>
              <div className="detail-grid" style={{ gap: '12px' }}>
                <div className="detail-field">
                  <span className="detail-field__label">Date</span>
                  <span className="detail-field__value">{selectedEvent.date.toLocaleDateString()}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field__label">Time</span>
                  <span className="detail-field__value">{formatTime(selectedEvent.startHour, selectedEvent.startMin)} - {formatTime(selectedEvent.endHour, selectedEvent.endMin)}</span>
                </div>
                {selectedEvent.linked && (
                  <div className="detail-field">
                    <span className="detail-field__label">Linked To</span>
                    <span className="detail-field__value">{selectedEvent.linked}</span>
                  </div>
                )}
                {selectedEvent.notes && (
                  <div className="detail-field">
                    <span className="detail-field__label">Notes</span>
                    <span className="detail-field__value">{selectedEvent.notes}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedEvent(null); openEdit(selectedEvent); }}>Edit</button>
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(selectedEvent.id)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={handleChange('title')} placeholder="Event title..." />
            </div>
            <div className="form-group">
              <label>Event Type</label>
              <select value={form.type} onChange={handleChange('type')}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={form.date} onChange={handleChange('date')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Start Time</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select value={form.startHour} onChange={handleChange('startHour')}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i)}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select value={form.startMin} onChange={handleChange('startMin')}>
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>End Time</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select value={form.endHour} onChange={handleChange('endHour')}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i)}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select value={form.endMin} onChange={handleChange('endMin')}>
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Linked Entity</label>
              <input value={form.linked} onChange={handleChange('linked')} placeholder="e.g. Artist: Nova Sinclair, Project: EP Title" />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea rows={3} value={form.notes} onChange={handleChange('notes')} placeholder="Additional details..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
                {editingEvent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
