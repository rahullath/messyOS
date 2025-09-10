/**
 * Task Scheduling Modal Component
 * Allows users to schedule tasks as calendar events with conflict detection
 */

import React, { useState, useEffect } from 'react';
import type { Task } from '../../types/task-management';
import type { CalendarSource, ScheduleTaskRequest, ScheduledTask, CalendarConflict } from '../../types/calendar';

interface TaskSchedulingModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: (scheduledTask: ScheduledTask) => void;
}

export const TaskSchedulingModal: React.FC<TaskSchedulingModalProps> = ({
  task,
  isOpen,
  onClose,
  onScheduled
}) => {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [scheduleData, setScheduleData] = useState<Partial<ScheduleTaskRequest>>({
    title: task.title,
    description: `Work on: ${task.title}`,
    estimated_duration: task.estimated_duration || 60,
    deadline: task.deadline,
    energy_required: task.energy_required || 'medium',
    priority: task.priority || 'medium',
    flexibility: 'flexible',
    importance: 'medium'
  });

  // Fetch calendar sources when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen]);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/calendar/sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar sources:', error);
    }
  };

  const checkConflicts = async () => {
    if (!scheduleData.preferred_start_time || !scheduleData.estimated_duration) return;

    try {
      const startTime = new Date(scheduleData.preferred_start_time);
      const endTime = new Date(startTime.getTime() + scheduleData.estimated_duration * 60000);

      const response = await fetch(`/api/calendar/conflicts?start=${startTime.toISOString()}&end=${endTime.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts || []);
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  // Check conflicts when preferred time changes
  useEffect(() => {
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [scheduleData.preferred_start_time, scheduleData.estimated_duration]);

  const handleSchedule = async () => {
    setLoading(true);
    try {
      const request: ScheduleTaskRequest = {
        task_id: task.id,
        user_id: task.user_id,
        title: scheduleData.title || task.title,
        description: scheduleData.description,
        estimated_duration: scheduleData.estimated_duration || 60,
        deadline: scheduleData.deadline,
        energy_required: scheduleData.energy_required,
        priority: scheduleData.priority,
        flexibility: scheduleData.flexibility,
        importance: scheduleData.importance,
        preferred_start_time: scheduleData.preferred_start_time,
        preferred_end_time: scheduleData.preferred_end_time,
        source_id: scheduleData.source_id
      };

      const response = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();

      if (response.ok) {
        onScheduled(data.scheduled_task);
        onClose();
      } else {
        alert(data.error || 'Failed to schedule task');
      }
    } catch (error) {
      console.error('Error scheduling task:', error);
      alert('Failed to schedule task');
    } finally {
      setLoading(false);
    }
  };

  const handleUnschedule = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/unschedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });

      const data = await response.json();

      if (response.ok) {
        onScheduled({ ...data, task_id: task.id } as ScheduledTask); // Trigger refresh
        onClose();
      } else {
        alert(data.error || 'Failed to unschedule task');
      }
    } catch (error) {
      console.error('Error unscheduling task:', error);
      alert('Failed to unschedule task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Schedule Task: {task.title}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="title">Event Title:</label>
            <input
              id="title"
              type="text"
              value={scheduleData.title || ''}
              onChange={e => setScheduleData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Event title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={scheduleData.description || ''}
              onChange={e => setScheduleData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duration">Duration (minutes):</label>
              <input
                id="duration"
                type="number"
                min="15"
                max="480"
                value={scheduleData.estimated_duration || 60}
                onChange={e => setScheduleData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="calendar-source">Calendar:</label>
              <select
                id="calendar-source"
                value={scheduleData.source_id || ''}
                onChange={e => setScheduleData(prev => ({ ...prev, source_id: e.target.value }))}
              >
                <option value="">Auto-select</option>
                {sources.filter(s => s.is_active).map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({source.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-time">Preferred Start Time:</label>
              <input
                id="start-time"
                type="datetime-local"
                value={scheduleData.preferred_start_time ? 
                  new Date(scheduleData.preferred_start_time).toISOString().slice(0, 16) : 
                  tomorrow.toISOString().slice(0, 16)
                }
                onChange={e => setScheduleData(prev => ({ 
                  ...prev, 
                  preferred_start_time: new Date(e.target.value).toISOString() 
                }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="flexibility">Flexibility:</label>
              <select
                id="flexibility"
                value={scheduleData.flexibility || 'flexible'}
                onChange={e => setScheduleData(prev => ({ ...prev, flexibility: e.target.value as any }))}
              >
                <option value="flexible">Flexible</option>
                <option value="moveable">Moveable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="energy">Energy Required:</label>
              <select
                id="energy"
                value={scheduleData.energy_required || 'medium'}
                onChange={e => setScheduleData(prev => ({ ...prev, energy_required: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="importance">Importance:</label>
              <select
                id="importance"
                value={scheduleData.importance || 'medium'}
                onChange={e => setScheduleData(prev => ({ ...prev, importance: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Conflict Detection */}
          {conflicts.length > 0 && (
            <div className="conflicts-section">
              <h3>⚠️ Scheduling Conflicts Detected</h3>
              {conflicts.map((conflict, index) => (
                <div key={index} className={`conflict-item ${conflict.severity}`}>
                  <div className="conflict-events">
                    {conflict.events.map(event => (
                      <span key={event.id} className="conflict-event">
                        {event.title} ({new Date(event.start_time).toLocaleTimeString()} - {new Date(event.end_time).toLocaleTimeString()})
                      </span>
                    ))}
                  </div>
                  {conflict.suggestion && (
                    <div className="conflict-suggestion">{conflict.suggestion}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {task.status === 'in_progress' && (
            <button 
              onClick={handleUnschedule} 
              disabled={loading}
              className="unschedule-button"
            >
              {loading ? 'Unscheduling...' : 'Unschedule'}
            </button>
          )}
          <button 
            onClick={handleSchedule} 
            disabled={loading || !scheduleData.estimated_duration}
            className="schedule-button"
          >
            {loading ? 'Scheduling...' : 'Schedule Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskSchedulingModal;