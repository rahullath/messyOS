import React, { useState, useEffect } from 'react';
import type { Task, TimeSession, StartSessionRequest, EndSessionRequest } from '../../types/task-management';

interface TimeTrackingModalProps {
  task: Task;
  activeSession?: TimeSession;
  isOpen: boolean;
  onClose: () => void;
  onSessionStarted: (session: TimeSession) => void;
  onSessionEnded: (session: TimeSession) => void;
}

export default function TimeTrackingModal({
  task,
  activeSession,
  isOpen,
  onClose,
  onSessionStarted,
  onSessionEnded
}: TimeTrackingModalProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(task.estimated_duration || 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Session feedback form state
  const [productivityRating, setProductivityRating] = useState(7);
  const [difficultyRating, setDifficultyRating] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [distractions, setDistractions] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'partial' | 'abandoned'>('completed');

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      setIsStarting(true);
      setError(null);

      const sessionData: StartSessionRequest = {
        task_id: task.id,
        estimated_duration: estimatedDuration
      };

      const response = await fetch('/api/time-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start session');
      }

      const result = await response.json();
      onSessionStarted(result.session);
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setIsStarting(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    try {
      setIsEnding(true);
      setError(null);

      const endData: EndSessionRequest = {
        completion_status: completionStatus,
        productivity_rating: productivityRating,
        difficulty_rating: difficultyRating,
        energy_level: energyLevel,
        distractions: distractions.split(',').map(d => d.trim()).filter(d => d),
        notes: notes.trim() || undefined
      };

      const response = await fetch(`/api/time-sessions/${activeSession.id}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end session');
      }

      const result = await response.json();
      onSessionEnded(result.session);
      onClose();
      
    } catch (err) {
      console.error('Error ending session:', err);
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            {activeSession ? 'Time Tracking Active' : 'Start Time Tracking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-medium text-white mb-2">{task.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Priority: {task.priority}</span>
            <span>Energy: {task.energy_required}</span>
            <span>Complexity: {task.complexity}</span>
          </div>
        </div>

        {!activeSession ? (
          // Start Session Form
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long do you plan to work on this task?
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={startSession}
                disabled={isStarting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isStarting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Start Session
              </button>
            </div>
          </div>
        ) : (
          // Active Session & End Session Form
          <div className="space-y-6">
            {/* Timer Display */}
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-gray-600">
                Estimated: {activeSession.estimated_duration || 'N/A'} minutes
                {activeSession.estimated_duration && (
                  <span className={`ml-2 ${elapsedTime > (activeSession.estimated_duration * 60) ? 'text-orange-600' : 'text-green-600'}`}>
                    ({Math.floor(elapsedTime / 60)} / {activeSession.estimated_duration})
                  </span>
                )}
              </div>
            </div>

            {/* Session Feedback Form */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-white">Session Feedback</h4>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Completion Status
                </label>
                <select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value as typeof completionStatus)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                >
                  <option value="completed">Completed Successfully</option>
                  <option value="partial">Partially Completed</option>
                  <option value="abandoned">Abandoned/Interrupted</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Productivity
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivityRating}
                    onChange={(e) => setProductivityRating(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{productivityRating}/10</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={difficultyRating}
                    onChange={(e) => setDifficultyRating(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{difficultyRating}/10</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Energy
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{energyLevel}/10</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Distractions (comma-separated)
                </label>
                <input
                  type="text"
                  value={distractions}
                  onChange={(e) => setDistractions(e.target.value)}
                  placeholder="phone, social media, email..."
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="How did the session go? Any insights or observations..."
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700"
              >
                Keep Running
              </button>
              <button
                onClick={endSession}
                disabled={isEnding}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isEnding ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                )}
                End Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}