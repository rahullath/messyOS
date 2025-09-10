import React, { useState } from 'react';
import type { CreateTaskRequest, TaskPriority, TaskComplexity, EnergyLevel } from '../../types/task-management';

interface TaskCreationModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: any) => void;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  complexity: TaskComplexity;
  energy_required: EnergyLevel;
  estimated_duration: string;
  deadline: string;
}

const CATEGORIES = [
  'Work',
  'Personal',
  'Learning',
  'Health',
  'Finance',
  'Creative',
  'Social',
  'Maintenance',
  'Planning',
  'Other'
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' }
];

export default function TaskCreationModal({ userId, isOpen, onClose, onTaskCreated }: TaskCreationModalProps) {
  const [mode, setMode] = useState<'manual' | 'natural'>('natural'); // Default to natural language
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessingNL, setIsProcessingNL] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<any[]>([]);
  const [parseResult, setParseResult] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: 'Work',
    priority: 'medium',
    complexity: 'moderate',
    energy_required: 'medium',
    estimated_duration: '',
    deadline: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.deadline && isNaN(Date.parse(formData.deadline))) {
      newErrors.deadline = 'Please enter a valid deadline';
    }

    if (formData.estimated_duration && parseInt(formData.estimated_duration) <= 0) {
      newErrors.estimated_duration = 'Duration must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const taskData: CreateTaskRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        priority: formData.priority,
        complexity: formData.complexity,
        energy_required: formData.energy_required,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
        deadline: formData.deadline || undefined,
        created_from: 'manual'
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          // Handle validation errors from API
          const apiErrors: Record<string, string> = {};
          result.details.forEach((error: { field: string; message: string }) => {
            apiErrors[error.field] = error.message;
          });
          setErrors(apiErrors);
        } else {
          throw new Error(result.error || 'Failed to create task');
        }
        return;
      }

      // Success - notify parent and close modal
      onTaskCreated(result.task);
      handleClose();
      
      // Show success message
      showToast('Task created successfully!', 'success');

    } catch (error) {
      console.error('Error creating task:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Natural Language Processing Functions
  const handleProcessNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) {
      showToast('Please enter some text to process', 'error');
      return;
    }

    setIsProcessingNL(true);
    setErrors({});

    try {
      const response = await fetch('/api/tasks/natural-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: naturalLanguageInput,
          mode: 'simple', // Just parse, don't save yet
          config: {
            enableReasoning: true,
            confidenceThreshold: 0.3
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process natural language');
      }

      setParseResult(data.result);
      setParsedTasks(data.result.tasks);
      
      if (data.result.tasks.length === 0) {
        showToast('No tasks could be extracted from your input. Try being more specific.', 'error');
      } else {
        showToast(`Successfully parsed ${data.result.tasks.length} task${data.result.tasks.length > 1 ? 's' : ''}!`, 'success');
      }

    } catch (error) {
      console.error('Error processing natural language:', error);
      showToast(error instanceof Error ? error.message : 'Failed to process natural language', 'error');
    } finally {
      setIsProcessingNL(false);
    }
  };

  const handleCreateParsedTasks = async () => {
    if (parsedTasks.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tasks/natural-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: naturalLanguageInput,
          mode: 'create', // Parse and save
          config: {
            enableReasoning: true,
            confidenceThreshold: 0.3
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tasks');
      }

      // Notify parent about created tasks
      if (data.result.savedTasks && data.result.savedTasks.length > 0) {
        data.result.savedTasks.forEach((task: any) => onTaskCreated(task));
        showToast(`Successfully created ${data.result.savedTasks.length} task${data.result.savedTasks.length > 1 ? 's' : ''}!`, 'success');
        handleClose();
      } else {
        showToast('No tasks were created', 'error');
      }

    } catch (error) {
      console.error('Error creating tasks:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create tasks', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillFromParsed = (task: any, index: number) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      complexity: task.complexity,
      energy_required: task.energy_required,
      estimated_duration: task.estimated_duration ? task.estimated_duration.toString() : '',
      deadline: task.deadline || ''
    });
    setMode('manual');
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Work',
      priority: 'medium',
      complexity: 'moderate',
      energy_required: 'medium',
      estimated_duration: '',
      deadline: ''
    });
    setNaturalLanguageInput('');
    setParsedTasks([]);
    setParseResult(null);
    setMode('natural');
    setErrors({});
    setIsSubmitting(false);
    setIsProcessingNL(false);
    onClose();
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-text-primary">Create New Task</h2>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-surface-hover rounded-full"
              disabled={isSubmitting || isProcessingNL}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex mb-6 bg-surface-hover rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('natural')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'natural' 
                  ? 'bg-accent-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
              disabled={isSubmitting || isProcessingNL}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Natural Language
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'manual' 
                  ? 'bg-accent-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
              disabled={isSubmitting || isProcessingNL}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Manual Form
              </div>
            </button>
          </div>

          {/* Natural Language Mode */}
          {mode === 'natural' && (
            <div className="space-y-6">
              {/* Natural Language Input */}
              <div>
                <label htmlFor="natural-input" className="block text-sm font-medium text-text-primary mb-2">
                  Describe your task(s) in natural language
                </label>
                <textarea
                  id="natural-input"
                  rows={4}
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary bg-surface placeholder-text-muted"
                  placeholder="e.g., 'I need to finish my assignment by Friday, call mom tomorrow, and buy groceries this week'"
                  disabled={isProcessingNL || isSubmitting}
                />
                <p className="mt-1 text-sm text-text-muted">
                  💡 Try: "Finish homework by tomorrow", "Call dentist to schedule appointment", or "Buy groceries, do laundry, and clean kitchen"
                </p>
              </div>

              {/* Process Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleProcessNaturalLanguage}
                  disabled={!naturalLanguageInput.trim() || isProcessingNL}
                  className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isProcessingNL ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Parse with AI
                    </>
                  )}
                </button>
              </div>

              {/* Parsed Tasks Results */}
              {parseResult && (
                <div className="border border-border rounded-lg p-4 bg-surface-hover">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-text-primary">
                      Parsed Tasks ({parsedTasks.length})
                    </h3>
                    <div className="text-sm text-text-secondary">
                      Confidence: {Math.round((parseResult.confidence || 0) * 100)}%
                    </div>
                  </div>

                  {parseResult.warnings && parseResult.warnings.length > 0 && (
                    <div className="mb-3 p-2 bg-accent-warning/20 border border-accent-warning/30 rounded text-sm text-accent-warning">
                      {parseResult.warnings.map((warning: string, index: number) => (
                        <div key={index}>⚠️ {warning}</div>
                      ))}
                    </div>
                  )}

                  {parsedTasks.length > 0 ? (
                    <div className="space-y-3">
                      {parsedTasks.map((task: any, index: number) => (
                        <div key={index} className="bg-surface border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-text-primary">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center mt-2 space-x-4 text-xs">
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                  {task.category}
                                </span>
                                <span className={`px-2 py-1 rounded ${
                                  task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {task.priority} priority
                                </span>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                  {task.complexity} complexity
                                </span>
                                <span className="text-text-muted">
                                  {Math.round((task.confidence || 0) * 100)}% confident
                                </span>
                              </div>
                              {task.deadline && (
                                <div className="text-xs text-text-muted mt-1">
                                  📅 Deadline: {new Date(task.deadline).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFillFromParsed(task, index)}
                              className="ml-2 text-accent-primary hover:text-accent-primary/80 text-xs underline"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Create All Tasks Button */}
                      <div className="flex justify-center pt-4 border-t">
                        <button
                          type="button"
                          onClick={handleCreateParsedTasks}
                          disabled={isSubmitting}
                          className="px-6 py-2 bg-accent-success text-white rounded-lg hover:bg-accent-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Create All Tasks ({parsedTasks.length})
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-center py-4">No tasks could be parsed from your input. Try being more specific.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual Form Mode */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-2">
                Task Title <span className="text-accent-error">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary ${
                  errors.title ? 'border-accent-error' : 'border-border'
                }`}
                placeholder="What needs to be done?"
                disabled={isSubmitting}
              />
              {errors.title && <p className="mt-1 text-sm text-accent-error">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary"
                placeholder="Describe the task in detail..."
                disabled={isSubmitting}
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-text-primary mb-2">
                  Category <span className="text-accent-error">*</span>
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary bg-surface ${
                    errors.category ? 'border-accent-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-sm text-accent-error">{errors.category}</p>}
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-text-primary mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary bg-surface"
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Complexity and Energy Required */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="complexity" className="block text-sm font-medium text-text-primary mb-2">
                  Complexity
                </label>
                <select
                  id="complexity"
                  value={formData.complexity}
                  onChange={(e) => setFormData(prev => ({ ...prev, complexity: e.target.value as TaskComplexity }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary bg-surface"
                  disabled={isSubmitting}
                >
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="complex">Complex</option>
                </select>
              </div>

              <div>
                <label htmlFor="energy_required" className="block text-sm font-medium text-text-primary mb-2">
                  Energy Required
                </label>
                <select
                  id="energy_required"
                  value={formData.energy_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, energy_required: e.target.value as EnergyLevel }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary bg-surface"
                  disabled={isSubmitting}
                >
                  <option value="low">Low Energy</option>
                  <option value="medium">Medium Energy</option>
                  <option value="high">High Energy</option>
                </select>
              </div>
            </div>

            {/* Estimated Duration and Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimated_duration" className="block text-sm font-medium text-text-primary mb-2">
                  Estimated Duration
                </label>
                <select
                  id="estimated_duration"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary ${
                    errors.estimated_duration ? 'border-accent-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Select duration</option>
                  {DURATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.estimated_duration && <p className="mt-1 text-sm text-accent-error">{errors.estimated_duration}</p>}
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-text-primary mb-2">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  id="deadline"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary ${
                    errors.deadline ? 'border-accent-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.deadline && <p className="mt-1 text-sm text-accent-error">{errors.deadline}</p>}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
