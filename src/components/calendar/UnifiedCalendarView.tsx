/**
 * Unified Calendar View Component
 * Displays events from all calendar sources in a unified interface
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { CalendarEvent, CalendarSource, CalendarViewProps } from '../../types/calendar';
import '../../styles/calendar.css';

interface UnifiedCalendarViewProps extends CalendarViewProps {
  className?: string;
}

export const UnifiedCalendarView: React.FC<UnifiedCalendarViewProps> = ({
  events,
  sources,
  selectedDate = new Date(),
  viewType = 'week',
  onEventClick,
  onTimeSlotClick,
  onEventUpdate,
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Filter events based on current view
  const filteredEvents = useMemo(() => {
    const start = getViewStart(currentDate, viewType);
    const end = getViewEnd(currentDate, viewType);

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < end && eventEnd > start;
    });
  }, [events, currentDate, viewType]);

  // Group events by day for easier rendering
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const dayKey = new Date(event.start_time).toDateString();
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });

    // Sort events within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });

    return grouped;
  }, [filteredEvents]);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleEventDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTimeSlotDrop = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEvent && onEventUpdate) {
      const duration = new Date(draggedEvent.end_time).getTime() - new Date(draggedEvent.start_time).getTime();
      const newStartTime = new Date(date);
      const newEndTime = new Date(date.getTime() + duration);

      const updatedEvent = {
        ...draggedEvent,
        start_time: newStartTime,
        end_time: newEndTime
      };

      onEventUpdate(updatedEvent);
    }
    setDraggedEvent(null);
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = eventsByDay[currentDate.toDateString()] || [];

    return (
      <div className="day-view">
        <div className="time-column">
          {hours.map(hour => (
            <div key={hour} className="time-slot">
              <span className="time-label">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
          ))}
        </div>
        <div className="events-column">
          {hours.map(hour => {
            const slotDate = new Date(currentDate);
            slotDate.setHours(hour, 0, 0, 0);
            
            const hourEvents = dayEvents.filter(event => {
              const eventHour = new Date(event.start_time).getHours();
              return eventHour === hour;
            });

            return (
              <div
                key={hour}
                className="hour-slot"
                onClick={() => onTimeSlotClick?.(slotDate)}
                onDrop={(e) => handleTimeSlotDrop(slotDate, e)}
                onDragOver={(e) => e.preventDefault()}
              >
                {hourEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    source={sources.find(s => s.id === event.source_id)}
                    onClick={() => onEventClick?.(event)}
                    onDragStart={(e) => handleEventDragStart(event, e)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      return day;
    });

    return (
      <div className="week-view">
        <div className="week-header">
          {weekDays.map(day => (
            <div key={day.toDateString()} className="day-header">
              <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="day-number">{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-body">
          {weekDays.map(day => {
            const dayEvents = eventsByDay[day.toDateString()] || [];
            return (
              <div
                key={day.toDateString()}
                className="day-column"
                onClick={() => onTimeSlotClick?.(day)}
                onDrop={(e) => handleTimeSlotDrop(day, e)}
                onDragOver={(e) => e.preventDefault()}
              >
                {dayEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    source={sources.find(s => s.id === event.source_id)}
                    onClick={() => onEventClick?.(event)}
                    onDragStart={(e) => handleEventDragStart(event, e)}
                    compact
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = getMonthStart(currentDate);
    const monthEnd = getMonthEnd(currentDate);
    const calendarStart = getWeekStart(monthStart);
    const calendarEnd = getWeekEnd(monthEnd);

    const days = [];
    const current = new Date(calendarStart);
    
    while (current <= calendarEnd) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return (
      <div className="month-view">
        <div className="month-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
          {days.map(day => {
            const dayEvents = eventsByDay[day.toDateString()] || [];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.toDateString()}
                className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => onTimeSlotClick?.(day)}
                onDrop={(e) => handleTimeSlotDrop(day, e)}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="day-number">{day.getDate()}</div>
                <div className="day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      source={sources.find(s => s.id === event.source_id)}
                      onClick={() => onEventClick?.(event)}
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      minimal
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="more-events">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`unified-calendar-view ${className}`}>
      <div className="calendar-header">
        <div className="navigation">
          <button onClick={handlePrevious} className="nav-button">
            ←
          </button>
          <h2 className="current-period">
            {formatPeriod(currentDate, viewType)}
          </h2>
          <button onClick={handleNext} className="nav-button">
            →
          </button>
        </div>
        <div className="view-controls">
          <button 
            className={viewType === 'day' ? 'active' : ''}
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>
      </div>

      <div className="calendar-body">
        {viewType === 'day' && renderDayView()}
        {viewType === 'week' && renderWeekView()}
        {viewType === 'month' && renderMonthView()}
      </div>
    </div>
  );
};

// Event Card Component
interface EventCardProps {
  event: CalendarEvent;
  source?: CalendarSource;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
  minimal?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  source,
  onClick,
  onDragStart,
  compact = false,
  minimal = false
}) => {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  
  // Special styling for task events
  const isTaskEvent = event.event_type === 'task';
  const taskIcon = isTaskEvent ? '📋' : '';
  const borderStyle = isTaskEvent ? 'dashed' : 'solid';
  const backgroundColor = isTaskEvent ? 
    `${source?.color || '#3b82f6'}22` : // More transparent for tasks
    source?.color || '#3b82f6';

  return (
    <div
      className={`event-card ${compact ? 'compact' : ''} ${minimal ? 'minimal' : ''} ${event.event_type} ${isTaskEvent ? 'task-event' : ''}`}
      style={{ 
        backgroundColor: backgroundColor,
        borderLeft: `4px ${borderStyle} ${source?.color || '#3b82f6'}`,
        border: isTaskEvent ? `1px ${borderStyle} ${source?.color || '#3b82f6'}66` : undefined
      }}
      onClick={onClick}
      draggable={event.flexibility !== 'fixed'}
      onDragStart={onDragStart}
    >
      <div className="event-title">
        {taskIcon} {event.title}
        {isTaskEvent && !minimal && (
          <span className="task-badge">Task</span>
        )}
      </div>
      {!minimal && (
        <div className="event-time">
          {startTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
          {!compact && ` - ${endTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}`}
          {isTaskEvent && ` (${Math.round(duration)}min)`}
        </div>
      )}
      {!compact && !minimal && event.location && (
        <div className="event-location">{event.location}</div>
      )}
      {!compact && !minimal && isTaskEvent && event.description && (
        <div className="task-description">{event.description}</div>
      )}
    </div>
  );
};

// Utility functions
function getViewStart(date: Date, viewType: 'day' | 'week' | 'month'): Date {
  const start = new Date(date);
  switch (viewType) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      return getWeekStart(date);
    case 'month':
      return getMonthStart(date);
  }
  return start;
}

function getViewEnd(date: Date, viewType: 'day' | 'week' | 'month'): Date {
  const end = new Date(date);
  switch (viewType) {
    case 'day':
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      return getWeekEnd(date);
    case 'month':
      return getMonthEnd(date);
  }
  return end;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekEnd(date: Date): Date {
  const end = getWeekStart(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getMonthStart(date: Date): Date {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthEnd(date: Date): Date {
  const end = new Date(date);
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatPeriod(date: Date, viewType: 'day' | 'week' | 'month'): string {
  switch (viewType) {
    case 'day':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'week':
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(date);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
}
