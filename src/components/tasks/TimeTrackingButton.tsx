import React, { useState, useEffect } from 'react';
import type { Task, TimeSession } from '../../types/task-management';
import TimeTrackingModal from './TimeTrackingModal';

interface TimeTrackingButtonProps {
  task: Task;
  onSessionUpdate?: () => void;
}

export default function TimeTrackingButton({ task, onSessionUpdate }: TimeTrackingButtonProps) {
  const [activeSession, setActiveSession] = useState<TimeSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check for active session on component mount and when task changes
  useEffect(() => {
    checkActiveSession();
    // Also check periodically in case session was started elsewhere
    const interval = setInterval(checkActiveSession, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [task.id]);

  // Timer effect for active sessions
  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.start_time).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000); // seconds
        setElapsedTime(elapsed);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      console.log(`Checking active session for task ${task.id}`);
      
      const response = await fetch(`/api/time-sessions?task_id=${task.id}&status=active&limit=1`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Active session check result:`, result);
        
        if (result.sessions && result.sessions.length > 0) {
          setActiveSession(result.sessions[0]);
          console.log(`Found active session:`, result.sessions[0]);
        } else {
          setActiveSession(null);
          console.log(`No active session found for task ${task.id}`);
        }
      } else {
        console.error(`Failed to check active session: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionStarted = (session: TimeSession) => {
    setActiveSession(session);
    setIsModalOpen(false);
    if (onSessionUpdate) {
      onSessionUpdate();
    }
  };

  const handleSessionEnded = (session: TimeSession) => {
    setActiveSession(null);
    setIsModalOpen(false);
    if (onSessionUpdate) {
      onSessionUpdate();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Only show for pending and in_progress tasks
  if (!['pending', 'in_progress'].includes(task.status)) {
    return null;
  }

  if (loading) {
    return (
      <div className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded cursor-not-allowed">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`px-3 py-1 text-sm rounded transition-colors flex items-center ${
          activeSession
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={activeSession ? `Active: ${formatTime(elapsedTime)}` : 'Start time tracking'}
      >
        {activeSession ? (
          <>
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            <span className="font-mono text-xs mr-1">{formatTime(elapsedTime)}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Track
          </>
        )}
      </button>

      <TimeTrackingModal
        task={task}
        activeSession={activeSession}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionStarted={handleSessionStarted}
        onSessionEnded={handleSessionEnded}
      />
    </>
  );
}