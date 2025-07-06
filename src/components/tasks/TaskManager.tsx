// src/components/tasks/TaskManager.tsx
import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  estimated_duration?: number;
  actual_duration?: number;
  due_date?: string;
  scheduled_for?: string;
  energy_required: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
  location?: string;
  context?: string[];
  tags?: string[];
  email_reminders: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface TaskSession {
  id: string;
  task_id: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  session_type: 'focus' | 'break' | 'review' | 'planning';
  productivity_score?: number;
  energy_level?: number;
  interruptions: number;
  notes?: string;
}

interface TaskManagerProps {
  initialTasks?: Task[];
  activeSession?: TaskSession & { tasks: { title: string } };
}

export default function TaskManager({ initialTasks = [], activeSession }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentSession, setCurrentSession] = useState<TaskSession | null>(activeSession || null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Timer state
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  useEffect(() => {
    if (currentSession && !currentSession.ended_at) {
      const interval = setInterval(() => {
        const now = new Date();
        const start = new Date(currentSession.started_at);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        setTimerDisplay(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const createTask = async (taskData: Partial<Task>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();
      
      if (result.success) {
        setTasks(prev => [result.task, ...prev]);
        setShowNewTaskModal(false);
        showToast('Task created successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to create task', 'error');
      }
    } catch (error) {
      showToast('Network error creating task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      
      if (result.success) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...result.task } : task
        ));
        showToast('Task updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update task', 'error');
      }
    } catch (error) {
      showToast('Network error updating task', 'error');
    }
  };

  const startTimer = async (taskId: string, taskTitle: string) => {
    if (currentSession) {
      showToast('Please stop the current timer first', 'warning');
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentSession(result.session);
        await updateTask(taskId, { status: 'in_progress' });
        showToast(`Timer started for: ${taskTitle}`, 'success');
      } else {
        showToast(result.error || 'Failed to start timer', 'error');
      }
    } catch (error) {
      showToast('Network error starting timer', 'error');
    }
  };

  const stopTimer = async (sessionData: {
    productivity_score?: number;
    energy_level?: number;
    notes?: string;
    interruptions?: number;
    task_completed?: boolean;
    completion_notes?: string;
    satisfaction_score?: number;
  } = {}) => {
    if (!currentSession) return;

    try {
      const response = await fetch(`/api/tasks/${currentSession.task_id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', ...sessionData })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentSession(null);
        setTimerDisplay('00:00:00');
        
        if (sessionData.task_completed) {
          await updateTask(currentSession.task_id, { status: 'completed' });
        }
        
        showToast(`Session completed! Duration: ${result.duration} minutes`, 'success');
        
        // Refresh tasks to show updated data
        window.location.reload();
      } else {
        showToast(result.error || 'Failed to stop timer', 'error');
      }
    } catch (error) {
      showToast('Network error stopping timer', 'error');
    }
  };

  const loadAIAnalysis = async (type: 'productivity_analysis' | 'task_prioritization' | 'time_blocking') => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const result = await response.json();
      
      if (result.success) {
        setAIAnalysis({ type, ...result.analysis });
        setShowAIAssistant(true);
      } else {
        showToast(result.error || 'Failed to load AI analysis', 'error');
      }
    } catch (error) {
      showToast('Network error loading AI analysis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="task-manager">
      {/* Active Timer Display */}
      {currentSession && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center space-x-3 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium">Active Timer</p>
              <p className="text-sm opacity-90">{timerDisplay}</p>
            </div>
            <button 
              onClick={() => {
                const productivity = prompt('Rate your productivity (1-10):');
                const energy = prompt('Rate your energy level (1-10):');
                const completed = confirm('Did you complete the task?');
                
                stopTimer({
                  productivity_score: productivity ? parseInt(productivity) : undefined,
                  energy_level: energy ? parseInt(energy) : undefined,
                  task_completed: completed
                });
              }}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Task Actions */}
      <div className="task-actions">
        <button 
          onClick={() => setShowNewTaskModal(true)}
          className="btn-primary"
        >
          New Task
        </button>
        
        <button 
          onClick={() => loadAIAnalysis('productivity_analysis')}
          className="btn-secondary"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'AI Assistant'}
        </button>
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <TaskFormModal
          onSubmit={createTask}
          onClose={() => setShowNewTaskModal(false)}
          loading={loading}
        />
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && aiAnalysis && (
        <AIAssistantModal
          analysis={aiAnalysis}
          onClose={() => setShowAIAssistant(false)}
          onLoadAnalysis={loadAIAnalysis}
          loading={loading}
        />
      )}

      {/* Task Event Handlers */}
      <TaskEventHandlers
        onStartTimer={startTimer}
        onUpdateTask={updateTask}
        onStopTimer={stopTimer}
      />
    </div>
  );
}

// Task Form Modal Component
function TaskFormModal({ onSubmit, onClose, loading }: {
  onSubmit: (data: any) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Work',
    priority: 'medium',
    estimated_duration: '',
    due_date: '',
    scheduled_for: '',
    energy_required: 'medium',
    complexity: 'moderate',
    location: '',
    tags: '',
    context: [],
    email_reminders: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processedData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
      due_date: formData.due_date || null,
      scheduled_for: formData.scheduled_for || null
    };

    onSubmit(processedData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">Create New Task</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Essential Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What needs to be done?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['Work', 'Personal', 'Learning', 'Health', 'Finance', 'Creative', 'Social', 'Maintenance', 'Planning', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the task in detail..."
              />
            </div>

            {/* Time & Scheduling */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Duration</label>
                <select 
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select duration</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input 
                  type="datetime-local" 
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Schedule For</label>
                <input 
                  type="datetime-local" 
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="border-t pt-4">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-800 text-sm mb-4"
              >
                {showAdvanced ? '▲' : '▼'} Advanced Options (Optional)
              </button>
              
              {showAdvanced && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Energy Required</label>
                      <select 
                        value={formData.energy_required}
                        onChange={(e) => setFormData(prev => ({ ...prev, energy_required: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low Energy</option>
                        <option value="medium">Medium Energy</option>
                        <option value="high">High Energy</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Complexity</label>
                      <select 
                        value={formData.complexity}
                        onChange={(e) => setFormData(prev => ({ ...prev, complexity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="simple">Simple</option>
                        <option value="moderate">Moderate</option>
                        <option value="complex">Complex</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Location</label>
                      <input 
                        type="text" 
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Home, Office, Cafe..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <input 
                        type="text" 
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="urgent, creative, meeting (comma separated)"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={formData.email_reminders}
                        onChange={(e) => setFormData(prev => ({ ...prev, email_reminders: e.target.checked }))}
                        className="rounded border-gray-300" 
                      />
                      <span className="text-sm">Email reminders</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// AI Assistant Modal Component
function AIAssistantModal({ analysis, onClose, onLoadAnalysis, loading }: {
  analysis: any;
  onClose: () => void;
  onLoadAnalysis: (type: string) => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">🤖 AI Task Assistant</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          {/* Analysis Type Buttons */}
          <div className="flex space-x-2 mb-6">
            <button 
              onClick={() => onLoadAnalysis('productivity_analysis')}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Productivity Analysis
            </button>
            <button 
              onClick={() => onLoadAnalysis('task_prioritization')}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Task Prioritization
            </button>
            <button 
              onClick={() => onLoadAnalysis('time_blocking')}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Time Blocking
            </button>
          </div>

          {/* Analysis Results */}
          <div className="space-y-6">
            {analysis.insights && (
              <div>
                <h4 className="text-lg font-semibold mb-3">📊 Insights</h4>
                <div className="space-y-3">
                  {analysis.insights.map((insight: any, index: number) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900">{insight.title}</h5>
                      <p className="text-blue-800 text-sm mt-1">{insight.description}</p>
                      {insight.recommendation && (
                        <p className="text-blue-700 text-sm mt-2 font-medium">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.optimizations && (
              <div>
                <h4 className="text-lg font-semibold mb-3">🚀 Optimizations</h4>
                <div className="space-y-3">
                  {analysis.optimizations.map((opt: any, index: number) => (
                    <div key={index} className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-900">{opt.area}</h5>
                      <p className="text-green-800 text-sm mt-1">{opt.current_issue}</p>
                      <p className="text-green-700 text-sm mt-2 font-medium">
                        ✅ {opt.solution}
                      </p>
                      <p className="text-green-600 text-xs mt-1">
                        Expected: {opt.expected_impact} | Difficulty: {opt.difficulty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.focus_suggestions && (
              <div>
                <h4 className="text-lg font-semibold mb-3">🎯 Focus Suggestions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h5 className="font-medium text-yellow-900">Today</h5>
                    <p className="text-yellow-800 text-sm mt-1">{analysis.focus_suggestions.today}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h5 className="font-medium text-orange-900">This Week</h5>
                    <p className="text-orange-800 text-sm mt-1">{analysis.focus_suggestions.this_week}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h5 className="font-medium text-purple-900">Energy</h5>
                    <p className="text-purple-800 text-sm mt-1">{analysis.focus_suggestions.energy_optimization}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Event Handlers Component
function TaskEventHandlers({ onStartTimer, onUpdateTask, onStopTimer }: {
  onStartTimer: (taskId: string, taskTitle: string) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onStopTimer: (sessionData?: any) => void;
}) {
  useEffect(() => {
    // Start timer buttons
    const startButtons = document.querySelectorAll('.start-timer-btn');
    startButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const taskId = target.getAttribute('data-task-id');
        const taskTitle = target.getAttribute('data-task-title');
        if (taskId && taskTitle) {
          onStartTimer(taskId, taskTitle);
        }
      });
    });

    // Complete task buttons
    const completeButtons = document.querySelectorAll('.complete-task-btn');
    completeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) {
          onUpdateTask(taskId, { status: 'completed', completed_at: new Date().toISOString() });
        }
      });
    });

    // Pause task buttons
    const pauseButtons = document.querySelectorAll('.pause-task-btn');
    pauseButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) {
          onUpdateTask(taskId, { status: 'on_hold' });
        }
      });
    });

    // Resume task buttons
    const resumeButtons = document.querySelectorAll('.resume-task-btn');
    resumeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) {
          onUpdateTask(taskId, { status: 'todo' });
        }
      });
    });

    // Stop timer button
    const stopTimerBtn = document.getElementById('stop-timer-btn');
    if (stopTimerBtn) {
      stopTimerBtn.addEventListener('click', () => {
        const productivity = prompt('Rate your productivity (1-10):');
        const energy = prompt('Rate your energy level (1-10):');
        const completed = confirm('Did you complete the task?');
        
        onStopTimer({
          productivity_score: productivity ? parseInt(productivity) : undefined,
          energy_level: energy ? parseInt(energy) : undefined,
          task_completed: completed
        });
      });
    }

    // Cleanup event listeners
    return () => {
      startButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
      completeButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
      pauseButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
      resumeButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
    };
  }, [onStartTimer, onUpdateTask, onStopTimer]);

  return null;
}