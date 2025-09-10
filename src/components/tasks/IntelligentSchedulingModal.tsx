import React, { useState, useEffect } from 'react';
import type { Task } from '../../types/task-management';
import { AutoSchedulerService } from '../../lib/intelligence/auto-scheduler-service';

interface IntelligentSchedulingModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskScheduled: (task: Task) => void;
}

interface SchedulingSlot {
  start_time: string;
  end_time: string;
  confidence_score: number;
  reasoning: string;
  energy_alignment: 'low' | 'medium' | 'high';
  conflict_risk: 'none' | 'minor' | 'major';
  optimal_factors: string[];
}

interface DecomposedSession {
  session_title: string;
  duration_minutes: number;
  sequence_order: number;
  dependencies: string[];
  energy_requirement: 'low' | 'medium' | 'high';
}

export default function IntelligentSchedulingModal({ 
  task, 
  isOpen, 
  onClose, 
  onTaskScheduled 
}: IntelligentSchedulingModalProps) {
  const [suggestions, setSuggestions] = useState<SchedulingSlot[]>([]);
  const [decomposedSessions, setDecomposedSessions] = useState<DecomposedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SchedulingSlot | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSchedulingSuggestions();
    }
  }, [isOpen, task.id]);

  const loadSchedulingSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AutoSchedulerService.suggestOptimalScheduling('user-id', task, {
        considerEnergyPatterns: true,
        considerHabits: true,
        decomposeComplexTasks: task.complexity === 'complex',
        lookAheadDays: 7
      });

      setSuggestions(result.suggested_slots);
      setDecomposedSessions(result.decomposed_sessions || []);
      
      // Auto-select the highest confidence slot
      if (result.suggested_slots.length > 0) {
        const bestSlot = result.suggested_slots[0];
        setSelectedSlot(bestSlot);
      }

    } catch (err) {
      console.error('Failed to load scheduling suggestions:', err);
      setError('Failed to generate scheduling suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scheduleTask = async (slot: SchedulingSlot, autoApprove: boolean = false) => {
    try {
      setScheduling(true);
      setError(null);

      const response = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          title: task.title,
          description: `AI-scheduled: ${slot.reasoning}`
        })
      });

      if (response.ok) {
        onTaskScheduled(task);
        onClose();
      } else {
        throw new Error('Failed to schedule task');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule task');
    } finally {
      setScheduling(false);
    }
  };

  const autoScheduleTask = async () => {
    try {
      setScheduling(true);
      setError(null);

      const result = await AutoSchedulerService.autoScheduleTask('user-id', task, 0.7);
      
      if (result.scheduled) {
        onTaskScheduled(task);
        onClose();
      } else {
        setError(result.reasoning);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-accent-success bg-accent-success/20';
    if (score >= 0.6) return 'text-accent-warning bg-accent-warning/20';
    return 'text-accent-error bg-accent-error/20';
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-accent-success';
      case 'medium': return 'text-accent-warning';
      case 'low': return 'text-accent-primary';
      default: return 'text-text-muted';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none': return 'text-accent-success';
      case 'minor': return 'text-accent-warning';  
      case 'major': return 'text-accent-error';
      default: return 'text-text-muted';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-text-primary">🤖 AI Task Scheduler</h2>
              <p className="text-text-secondary text-sm mt-1">
                Smart scheduling for: <span className="font-medium text-accent-primary">{task.title}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-surface-hover rounded-full"
              disabled={loading || scheduling}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-accent-error/20 border border-accent-error/30 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-accent-error mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-accent-error text-sm">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
              <span className="ml-3 text-text-secondary">AI is analyzing your schedule...</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Quick Auto-Schedule Option */}
              <div className="bg-accent-primary/20 border border-accent-primary/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-accent-primary">⚡ Quick Auto-Schedule</h3>
                    <p className="text-text-secondary text-sm">
                      Let AI pick the best time slot automatically (confidence threshold: 70%)
                    </p>
                  </div>
                  <button
                    onClick={autoScheduleTask}
                    disabled={scheduling || suggestions.length === 0}
                    className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {scheduling ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scheduling...
                      </div>
                    ) : (
                      'Auto-Schedule'
                    )}
                  </button>
                </div>
              </div>

              {/* Decomposed Sessions (for complex tasks) */}
              {decomposedSessions.length > 0 && (
                <div className="bg-accent-purple/20 border border-accent-purple/30 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-accent-purple mb-3">
                    🧩 AI Task Breakdown
                  </h3>
                  <p className="text-text-secondary text-sm mb-4">
                    This complex task has been broken down into focused sessions:
                  </p>
                  <div className="space-y-2">
                    {decomposedSessions.map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-surface-hover rounded">
                        <div>
                          <span className="text-text-primary font-medium">
                            {session.sequence_order}. {session.session_title}
                          </span>
                          <div className="flex items-center space-x-4 mt-1 text-sm">
                            <span className="text-text-muted">
                              {session.duration_minutes} min
                            </span>
                            <span className={getEnergyColor(session.energy_requirement)}>
                              {session.energy_requirement} energy
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Scheduling Suggestions */}
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-4">
                  🎯 AI Scheduling Suggestions
                </h3>
                
                {suggestions.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p>No scheduling suggestions available</p>
                    <button
                      onClick={loadSchedulingSuggestions}
                      className="mt-2 px-4 py-2 bg-surface border border-border text-text-primary rounded hover:bg-surface-hover"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((slot, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedSlot === slot
                            ? 'border-accent-primary bg-accent-primary/20'
                            : 'border-border bg-surface-hover hover:border-accent-primary/50'
                        }`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-text-primary font-medium">
                                Option {index + 1}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${getConfidenceColor(slot.confidence_score)}`}>
                                {Math.round(slot.confidence_score * 100)}% confidence
                              </span>
                              <span className={`text-sm ${getRiskColor(slot.conflict_risk)}`}>
                                {slot.conflict_risk === 'none' ? '✅ No conflicts' : 
                                 slot.conflict_risk === 'minor' ? '⚠️ Minor conflicts' :
                                 '🚨 Major conflicts'}
                              </span>
                            </div>
                            
                            <div className="text-text-secondary mb-2">
                              📅 {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
                            </div>
                            
                            <p className="text-text-muted text-sm mb-3">
                              {slot.reasoning}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs">
                              <span className={`flex items-center ${getEnergyColor(slot.energy_alignment)}`}>
                                ⚡ {slot.energy_alignment} energy match
                              </span>
                              <div className="flex items-center space-x-2">
                                {slot.optimal_factors.map((factor, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-surface border border-border text-text-secondary rounded">
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              scheduleTask(slot);
                            }}
                            disabled={scheduling}
                            className="ml-4 px-4 py-2 bg-accent-success text-white rounded hover:bg-accent-success/90 disabled:opacity-50"
                          >
                            Schedule
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <p className="text-text-muted text-sm">
              💡 AI analyzes your calendar, energy patterns, and habits to find optimal scheduling
            </p>
            <button
              onClick={onClose}
              disabled={scheduling}
              className="px-4 py-2 text-text-secondary border border-border rounded hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}