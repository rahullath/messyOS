import React, { useState, useEffect } from 'react';
import type { TimeSession } from '../../types/task-management';

interface ActiveSessionWithTask extends TimeSession {
  tasks?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
}

export default function ActiveSessionsDebug() {
  const [sessions, setSessions] = useState<ActiveSessionWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/time-sessions/active');
      
      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }

      const result = await response.json();
      setSessions(result.sessions || []);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/time-sessions/${sessionId}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completion_status: 'abandoned',
          productivity_rating: 5,
          difficulty_rating: 5,
          energy_level: 5,
          notes: 'Stopped via debug panel'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop session');
      }

      // Refresh the list
      fetchActiveSessions();
    } catch (err) {
      console.error('Error stopping session:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    }
  };

  const formatTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800">🐛 Active Sessions Debug</h3>
        <p className="text-yellow-600 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-yellow-800">🐛 Active Sessions Debug</h3>
        <button
          onClick={fetchActiveSessions}
          className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 rounded p-2 mb-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-yellow-600 text-sm">No active sessions found</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {session.tasks?.title || 'Unknown Task'} 
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {session.tasks?.category}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Session ID: {session.id.slice(0, 8)}... | 
                    Started: {new Date(session.start_time).toLocaleTimeString()} | 
                    Running: {formatTime(session.start_time)}
                  </p>
                  <p className="text-gray-500">
                    Task ID: {session.task_id}
                  </p>
                </div>
                <button
                  onClick={() => stopSession(session.id)}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Stop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}