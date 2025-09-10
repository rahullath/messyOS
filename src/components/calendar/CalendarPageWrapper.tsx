import React, { useState, useEffect } from 'react';
import type { CalendarSource, CalendarEvent, CreateCalendarSourceRequest, UpdateCalendarSourceRequest } from '../../types/calendar';
import { CalendarSourceManager } from './CalendarSourceManager';
import { UnifiedCalendarView } from './UnifiedCalendarView';
import '../../styles/task-calendar-integration.css';

interface CalendarPageWrapperProps {
  userId: string;
}

// This component will fetch data and handle interactions
const CalendarPageWrapper: React.FC<CalendarPageWrapperProps> = ({ userId }) => {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [selectedView, setSelectedView] = useState<'day' | 'week' | 'month'>('week');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const fetchData = async () => {
    try {
      const [sourcesRes, eventsRes] = await Promise.all([
        fetch('/api/calendar/sources'),
        fetch('/api/calendar/events')
      ]);
      const sourcesData = await sourcesRes.json();
      const eventsData = await eventsRes.json();

      if (sourcesRes.ok) {
        setSources(sourcesData.sources || []);
      }
      if (eventsRes.ok) {
        const parsedEvents = (eventsData.events || []).map((e: any) => ({
          ...e,
          start_time: new Date(e.start_time),
          end_time: new Date(e.end_time),
        }));
        setEvents(parsedEvents);
      }
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on showTasks setting
  const filteredEvents = showTasks ? events : events.filter(e => e.event_type !== 'task');

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSource = async (source: CreateCalendarSourceRequest) => {
    const response = await fetch('/api/calendar/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    if (response.ok) {
      fetchData(); // Refresh all data
    }
  };

  const handleUpdateSource = async (id: string, updates: UpdateCalendarSourceRequest) => {
     const response = await fetch(`/api/calendar/sources?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.ok) {
      fetchData();
    }
  };
  
  const handleDeleteSource = async (id: string) => {
    const response = await fetch(`/api/calendar/sources?id=${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      fetchData();
    }
  };

  const handleSyncSource = async (id: string) => {
    const response = await fetch(`/api/calendar/sync?source_id=${id}`, {
      method: 'POST',
    });
    if (response.ok) {
      fetchData();
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (response.ok) {
      setShowNewEventModal(false);
      fetchData(); // Refresh events
    } else {
      const errorData = await response.json();
      console.error('Failed to create event:', errorData);
      // You could show an error message to the user here
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleUpdateEvent = async (eventData: any) => {
    const response = await fetch(`/api/calendar/events?id=${editingEvent?.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (response.ok) {
      setEditingEvent(null);
      fetchData(); // Refresh events
    } else {
      const errorData = await response.json();
      console.error('Failed to update event:', errorData);
      // You could show an error message to the user here
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const response = await fetch(`/api/calendar/events?id=${eventId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      fetchData(); // Refresh events
    } else {
      const errorData = await response.json();
      console.error('Failed to delete event:', errorData);
      // You could show an error message to the user here
    }
  };

  if (loading) {
    return <div>Loading Calendar...</div>;
  }

  return (
    <>
      <div className="calendar-controls">
        <div className="view-controls">
          <button 
            className={selectedView === 'day' ? 'active' : ''}
            onClick={() => setSelectedView('day')}
          >
            Day
          </button>
          <button 
            className={selectedView === 'week' ? 'active' : ''}
            onClick={() => setSelectedView('week')}
          >
            Week
          </button>
          <button 
            className={selectedView === 'month' ? 'active' : ''}
            onClick={() => setSelectedView('month')}
          >
            Month
          </button>
        </div>

        <div className="event-actions">
          <button 
            onClick={() => setShowNewEventModal(true)}
            className="btn btn-primary"
            disabled={sources.length === 0}
          >
            <span className="icon">✨</span>
            New Event
          </button>
        </div>
        
        <div className="display-options">
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={(e) => setShowTasks(e.target.checked)}
            />
            Show Task Events
          </label>
        </div>
      </div>

      <div className="sources-section">
        <CalendarSourceManager
          sources={sources}
          onAddSource={handleAddSource}
          onUpdateSource={handleUpdateSource}
          onDeleteSource={handleDeleteSource}
          onSyncSource={handleSyncSource}
        />
      </div>
      
      <div className="calendar-section">
        <UnifiedCalendarView 
          events={filteredEvents} 
          sources={sources} 
          viewType={selectedView}
          onEventClick={handleEventClick}
          onEventUpdate={() => fetchData()} // Refresh when events change
        />
      </div>

      {/* Statistics */}
      <div className="calendar-stats">
        <div className="stat-item">
          <span className="stat-label">Total Events:</span>
          <span className="stat-value">{events.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Task Events:</span>
          <span className="stat-value">{events.filter(e => e.event_type === 'task').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Calendar Events:</span>
          <span className="stat-value">{events.filter(e => e.event_type !== 'task').length}</span>
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <NewEventModal
          sources={sources}
          onSubmit={handleCreateEvent}
          onClose={() => setShowNewEventModal(false)}
        />
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          source={sources.find(s => s.id === selectedEvent.source_id)}
          onClose={() => setSelectedEvent(null)}
          onEdit={(event) => {
            setSelectedEvent(null);
            setEditingEvent(event);
          }}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          sources={sources}
          onSubmit={handleUpdateEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </>
  );
};

// New Event Modal Component
interface NewEventModalProps {
  sources: CalendarSource[];
  onSubmit: (eventData: any) => Promise<void>;
  onClose: () => void;
}

const NewEventModal: React.FC<NewEventModalProps> = ({ sources, onSubmit, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal'>('personal');

  // Get today's date in YYYY-MM-DD format for default values
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const defaultStartTime = `${todayStr}T${today.getHours().toString().padStart(2, '0')}:00`;
  const defaultEndTime = `${todayStr}T${(today.getHours() + 1).toString().padStart(2, '0')}:00`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const eventData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        start_time: new Date(formData.get('start_time') as string).toISOString(),
        end_time: new Date(formData.get('end_time') as string).toISOString(),
        location: formData.get('location') as string,
        event_type: eventType,
        flexibility: formData.get('flexibility') as string,
        importance: formData.get('importance') as string,
        source_id: formData.get('source_id') as string,
      };
      
      await onSubmit(eventData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Event</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Title *</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="Meeting with team, Doctor appointment, etc."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Calendar Source *</label>
            <select name="source_id" required>
              <option value="">Select a calendar</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.type})
                </option>
              ))}
            </select>
            <small>Choose which calendar this event belongs to</small>
          </div>

          <div className="form-group">
            <label>Event Type</label>
            <select 
              name="event_type" 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value as any)}
            >
              <option value="personal">Personal</option>
              <option value="meeting">Meeting</option>
              <option value="class">Class</option>
              <option value="workout">Workout</option>
              <option value="meal">Meal</option>
              <option value="break">Break</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input 
                type="datetime-local" 
                name="start_time" 
                required
                defaultValue={defaultStartTime}
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input 
                type="datetime-local" 
                name="end_time" 
                required
                defaultValue={defaultEndTime}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              name="location" 
              placeholder="Conference room, address, URL, etc."
            />
            <small>Physical location, address, or meeting link</small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              rows={3}
              placeholder="Event details, agenda, notes..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Flexibility</label>
              <select name="flexibility" defaultValue="moveable">
                <option value="fixed">Fixed (cannot be moved)</option>
                <option value="moveable">Moveable (can reschedule if needed)</option>
                <option value="flexible">Flexible (very easy to reschedule)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Importance</label>
              <select name="importance" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Event Details Modal Component
interface EventDetailsModalProps {
  event: CalendarEvent;
  source?: CalendarSource;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, source, onClose, onEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);

  const formatDateTime = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const startDateTime = formatDateTime(event.start_time);
  const endDateTime = formatDateTime(event.end_time);
  const duration = Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60));
  const isTaskEvent = event.event_type === 'task';

  const handleDelete = async () => {
    if (confirm(`Delete "${event.title}"? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await onDelete(event.id);
      } finally {
        setLoading(false);
      }
    }
  };

  const openLocationLink = () => {
    if (event.location) {
      // Check if it's a URL
      if (event.location.startsWith('http://') || event.location.startsWith('https://')) {
        window.open(event.location, '_blank');
      } else if (event.location.includes('meet.google.com') || event.location.includes('zoom.us')) {
        // Handle meeting links that might not have http prefix
        window.open(`https://${event.location}`, '_blank');
      } else {
        // Treat as address and open in maps
        window.open(`https://maps.google.com?q=${encodeURIComponent(event.location)}`, '_blank');
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="event-header">
            <div className="event-title-section">
              <h3>{event.title}</h3>
              {isTaskEvent && <span className="task-badge">Task</span>}
              <div className="event-type-badge" style={{ backgroundColor: source?.color || '#3b82f6' }}>
                {event.event_type}
              </div>
            </div>
            <div className="event-source">
              <span style={{ color: source?.color || '#3b82f6' }}>
                📅 {source?.name || 'Unknown Calendar'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="event-details-content">
          <div className="detail-section">
            <h4>📅 Date & Time</h4>
            <div className="time-details">
              <div className="time-row">
                <strong>Start:</strong> {startDateTime.date} at {startDateTime.time}
              </div>
              <div className="time-row">
                <strong>End:</strong> {endDateTime.date} at {endDateTime.time}
              </div>
              <div className="time-row">
                <strong>Duration:</strong> {Math.floor(duration / 60)}h {duration % 60}m
              </div>
            </div>
          </div>

          {event.location && (
            <div className="detail-section">
              <h4>📍 Location</h4>
              <div className="location-details">
                <span className="location-text">{event.location}</span>
                <button 
                  onClick={openLocationLink}
                  className="btn btn-sm btn-secondary location-link"
                >
                  {event.location.includes('http') || event.location.includes('meet') || event.location.includes('zoom') ? '🔗 Join' : '📍 Open in Maps'}
                </button>
              </div>
            </div>
          )}

          {event.description && (
            <div className="detail-section">
              <h4>📝 Description</h4>
              <p className="description-text">{event.description}</p>
            </div>
          )}

          <div className="detail-section">
            <h4>⚙️ Event Properties</h4>
            <div className="properties-grid">
              <div className="property">
                <strong>Importance:</strong> 
                <span className={`importance-badge ${event.importance}`}>
                  {event.importance}
                </span>
              </div>
              <div className="property">
                <strong>Flexibility:</strong> 
                <span className={`flexibility-badge ${event.flexibility}`}>
                  {event.flexibility}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button 
            onClick={() => onEdit(event)} 
            className="btn btn-primary"
          >
            ✏️ Edit
          </button>
          <button 
            onClick={handleDelete}
            disabled={loading}
            className="btn btn-danger"
          >
            {loading ? 'Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Event Modal Component
interface EditEventModalProps {
  event: CalendarEvent;
  sources: CalendarSource[];
  onSubmit: (eventData: any) => Promise<void>;
  onClose: () => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ event, sources, onSubmit, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal'>(event.event_type);

  // Format dates for datetime-local input
  const formatDateTimeLocal = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const eventData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        start_time: new Date(formData.get('start_time') as string).toISOString(),
        end_time: new Date(formData.get('end_time') as string).toISOString(),
        location: formData.get('location') as string,
        event_type: eventType,
        flexibility: formData.get('flexibility') as string,
        importance: formData.get('importance') as string,
        source_id: formData.get('source_id') as string,
      };
      
      await onSubmit(eventData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Event</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Title *</label>
            <input 
              type="text" 
              name="title" 
              required 
              defaultValue={event.title}
              placeholder="Meeting with team, Doctor appointment, etc."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Calendar Source *</label>
            <select name="source_id" required defaultValue={event.source_id}>
              <option value="">Select a calendar</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.type})
                </option>
              ))}
            </select>
            <small>Choose which calendar this event belongs to</small>
          </div>

          <div className="form-group">
            <label>Event Type</label>
            <select 
              name="event_type" 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value as any)}
            >
              <option value="personal">Personal</option>
              <option value="meeting">Meeting</option>
              <option value="class">Class</option>
              <option value="workout">Workout</option>
              <option value="meal">Meal</option>
              <option value="break">Break</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input 
                type="datetime-local" 
                name="start_time" 
                required
                defaultValue={formatDateTimeLocal(event.start_time)}
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input 
                type="datetime-local" 
                name="end_time" 
                required
                defaultValue={formatDateTimeLocal(event.end_time)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              name="location" 
              defaultValue={event.location || ''}
              placeholder="Conference room, address, URL, etc."
            />
            <small>Physical location, address, or meeting link</small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              rows={3}
              defaultValue={event.description || ''}
              placeholder="Event details, agenda, notes..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Flexibility</label>
              <select name="flexibility" defaultValue={event.flexibility}>
                <option value="fixed">Fixed (cannot be moved)</option>
                <option value="moveable">Moveable (can reschedule if needed)</option>
                <option value="flexible">Flexible (very easy to reschedule)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Importance</label>
              <select name="importance" defaultValue={event.importance}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarPageWrapper;
