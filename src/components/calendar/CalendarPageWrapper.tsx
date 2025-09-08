import React, { useState, useEffect } from 'react';
import type { CalendarSource, CalendarEvent, CreateCalendarSourceRequest, UpdateCalendarSourceRequest } from '../../types/calendar';
import { CalendarSourceManager } from './CalendarSourceManager';
import { UnifiedCalendarView } from './UnifiedCalendarView';

interface CalendarPageWrapperProps {
  userId: string;
}

// This component will fetch data and handle interactions
const CalendarPageWrapper: React.FC<CalendarPageWrapperProps> = ({ userId }) => {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div>Loading Calendar...</div>;
  }

  return (
    <>
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
        <UnifiedCalendarView events={events} sources={sources} />
      </div>
    </>
  );
};

export default CalendarPageWrapper;
