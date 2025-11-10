// src/components/habits/HabitCreationModal.tsx
import React, { useState, useEffect } from 'react';

interface HabitTemplate {
  id: string;
  name: string;
  category: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  description: string;
  suggested_target?: number;
  color: string;
}

interface NewHabitData {
  name: string;
  description?: string;
  category: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  target_value?: number;
  target_unit?: string;
  color: string;
  reminder_time?: string;
  allows_skips: boolean;
}

interface HabitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: NewHabitData) => Promise<void>;
}

const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'exercise',
    name: 'Exercise',
    category: 'Health',
    type: 'build',
    measurement_type: 'duration',
    description: 'Daily physical activity to stay healthy',
    suggested_target: 30,
    color: '#10B981'
  },
  {
    id: 'meditation',
    name: 'Meditation',
    category: 'Wellness',
    type: 'build',
    measurement_type: 'duration',
    description: 'Mindfulness practice for mental clarity',
    suggested_target: 10,
    color: '#8B5CF6'
  },
  {
    id: 'reading',
    name: 'Reading',
    category: 'Learning',
    type: 'build',
    measurement_type: 'duration',
    description: 'Daily reading for personal growth',
    suggested_target: 30,
    color: '#3B82F6'
  },
  {
    id: 'water',
    name: 'Drink Water',
    category: 'Health',
    type: 'build',
    measurement_type: 'count',
    description: 'Stay hydrated throughout the day',
    suggested_target: 8,
    color: '#06B6D4'
  },
  {
    id: 'journaling',
    name: 'Journaling',
    category: 'Wellness',
    type: 'build',
    measurement_type: 'boolean',
    description: 'Daily reflection and gratitude practice',
    color: '#F59E0B'
  },
  {
    id: 'social-media',
    name: 'Limit Social Media',
    category: 'Productivity',
    type: 'break',
    measurement_type: 'duration',
    description: 'Reduce time spent on social media',
    suggested_target: 60,
    color: '#EF4444'
  },
  {
    id: 'sleep',
    name: 'Sleep 8 Hours',
    category: 'Health',
    type: 'maintain',
    measurement_type: 'duration',
    description: 'Maintain consistent sleep schedule',
    suggested_target: 8,
    color: '#6366F1'
  },
  {
    id: 'walk',
    name: 'Daily Walk',
    category: 'Health',
    type: 'build',
    measurement_type: 'boolean',
    description: 'Take a walk outside for fresh air',
    color: '#059669'
  }
];

const CATEGORIES = [
  'Health', 'Wellness', 'Learning', 'Productivity', 'Finance', 'Social', 'Creative', 'Other'
];

const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899'
];

export default function HabitCreationModal({ isOpen, onClose, onSave }: HabitCreationModalProps) {
  const [step, setStep] = useState<'templates' | 'basic' | 'measurement' | 'preferences' | 'review'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [habitData, setHabitData] = useState<NewHabitData>({
    name: '',
    description: '',
    category: 'Health',
    type: 'build',
    measurement_type: 'boolean',
    color: '#3B82F6',
    allows_skips: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('templates');
      setSelectedTemplate(null);
      setHabitData({
        name: '',
        description: '',
        category: 'Health',
        type: 'build',
        measurement_type: 'boolean',
        color: '#3B82F6',
        allows_skips: false
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateStep = (currentStep: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'basic') {
      if (!habitData.name.trim()) {
        newErrors.name = 'Habit name is required';
      }
      if (!habitData.category) {
        newErrors.category = 'Category is required';
      }
    }

    if (currentStep === 'measurement') {
      if (habitData.measurement_type === 'count' || habitData.measurement_type === 'duration') {
        if (!habitData.target_value || habitData.target_value <= 0) {
          newErrors.target_value = 'Target value must be greater than 0';
        }
        if (habitData.measurement_type === 'duration' && !habitData.target_unit) {
          newErrors.target_unit = 'Time unit is required for duration habits';
        }
        if (habitData.measurement_type === 'count' && !habitData.target_unit) {
          newErrors.target_unit = 'Unit is required for count habits';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    const steps = ['templates', 'basic', 'measurement', 'preferences', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1] as any);
    }
  };

  const handleBack = () => {
    const steps = ['templates', 'basic', 'measurement', 'preferences', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1] as any);
    }
  };

  const handleTemplateSelect = (template: HabitTemplate) => {
    setSelectedTemplate(template);
    setHabitData({
      name: template.name,
      description: template.description,
      category: template.category,
      type: template.type,
      measurement_type: template.measurement_type,
      target_value: template.suggested_target,
      target_unit: template.measurement_type === 'duration' ? 'minutes' : 
                   template.measurement_type === 'count' ? 'times' : undefined,
      color: template.color,
      allows_skips: false
    });
    setStep('basic');
  };

  const handleSkipTemplates = () => {
    setSelectedTemplate(null);
    setStep('basic');
  };

  const handleSave = async () => {
    if (!validateStep('review')) return;

    setIsLoading(true);
    try {
      await onSave(habitData);
      onClose();
    } catch (error) {
      console.error('Error saving habit:', error);
      setErrors({ general: 'Failed to save habit. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Habit</h2>
              <p className="text-gray-400 text-sm">
                {step === 'templates' && 'Choose from popular templates or start from scratch'}
                {step === 'basic' && 'Basic information about your habit'}
                {step === 'measurement' && 'How will you track this habit?'}
                {step === 'preferences' && 'Customize your habit preferences'}
                {step === 'review' && 'Review and create your habit'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              {['templates', 'basic', 'measurement', 'preferences', 'review'].map((s, index) => {
                const steps = ['templates', 'basic', 'measurement', 'preferences', 'review'];
                const currentIndex = steps.indexOf(step);
                const isActive = index <= currentIndex;
                return (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    {index < 4 && (
                      <div className={`w-8 h-1 mx-2 ${
                        isActive ? 'bg-blue-600' : 'bg-gray-700'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {step === 'templates' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {HABIT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full mt-1"
                          style={{ backgroundColor: template.color }}
                        ></div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{template.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              template.type === 'build' ? 'bg-green-500/20 text-green-400' :
                              template.type === 'break' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {template.type}
                            </span>
                            <span className="text-xs text-gray-500">{template.category}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSkipTemplates}
                  className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Start from Scratch
                </button>
              </div>
            )}

            {step === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Habit Name *
                  </label>
                  <input
                    type="text"
                    value={habitData.name}
                    onChange={(e) => setHabitData({ ...habitData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Morning Exercise"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={habitData.description}
                    onChange={(e) => setHabitData({ ...habitData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="What is this habit about?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={habitData.category}
                      onChange={(e) => setHabitData({ ...habitData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Habit Type
                    </label>
                    <select
                      value={habitData.type}
                      onChange={(e) => setHabitData({ ...habitData, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="build">Build (positive habit)</option>
                      <option value="break">Break (stop bad habit)</option>
                      <option value="maintain">Maintain (keep current level)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 'measurement' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    How will you measure this habit?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="radio"
                        name="measurement_type"
                        value="boolean"
                        checked={habitData.measurement_type === 'boolean'}
                        onChange={(e) => setHabitData({ ...habitData, measurement_type: e.target.value as any })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-white font-medium">Yes/No (Boolean)</div>
                        <div className="text-gray-400 text-sm">Simple completion tracking</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="radio"
                        name="measurement_type"
                        value="count"
                        checked={habitData.measurement_type === 'count'}
                        onChange={(e) => setHabitData({ ...habitData, measurement_type: e.target.value as any })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-white font-medium">Count</div>
                        <div className="text-gray-400 text-sm">Track number of times (e.g., 8 glasses of water)</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="radio"
                        name="measurement_type"
                        value="duration"
                        checked={habitData.measurement_type === 'duration'}
                        onChange={(e) => setHabitData({ ...habitData, measurement_type: e.target.value as any })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-white font-medium">Duration</div>
                        <div className="text-gray-400 text-sm">Track time spent (e.g., 30 minutes of exercise)</div>
                      </div>
                    </label>
                  </div>
                </div>

                {(habitData.measurement_type === 'count' || habitData.measurement_type === 'duration') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target Value *
                      </label>
                      <input
                        type="number"
                        value={habitData.target_value || ''}
                        onChange={(e) => setHabitData({ ...habitData, target_value: parseInt(e.target.value) || undefined })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 30"
                        min="1"
                      />
                      {errors.target_value && <p className="text-red-400 text-sm mt-1">{errors.target_value}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Unit *
                      </label>
                      {habitData.measurement_type === 'duration' ? (
                        <select
                          value={habitData.target_unit || ''}
                          onChange={(e) => setHabitData({ ...habitData, target_unit: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select unit</option>
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={habitData.target_unit || ''}
                          onChange={(e) => setHabitData({ ...habitData, target_unit: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., glasses, reps, pages"
                        />
                      )}
                      {errors.target_unit && <p className="text-red-400 text-sm mt-1">{errors.target_unit}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'preferences' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color Theme
                  </label>
                  <div className="flex space-x-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setHabitData({ ...habitData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          habitData.color === color ? 'border-white' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reminder Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={habitData.reminder_time || ''}
                    onChange={(e) => setHabitData({ ...habitData, reminder_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={habitData.allows_skips}
                      onChange={(e) => setHabitData({ ...habitData, allows_skips: e.target.checked })}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-white font-medium">Allow Skip Days</div>
                      <div className="text-gray-400 text-sm">Skip days won't break your streak</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Review Your Habit</h3>
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: habitData.color }}
                    ></div>
                    <h4 className="text-xl font-semibold text-white">{habitData.name}</h4>
                  </div>
                  
                  {habitData.description && (
                    <p className="text-gray-300">{habitData.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white ml-2">{habitData.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        habitData.type === 'build' ? 'bg-green-500/20 text-green-400' :
                        habitData.type === 'break' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {habitData.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Measurement:</span>
                      <span className="text-white ml-2">
                        {habitData.measurement_type === 'boolean' ? 'Yes/No' :
                         habitData.measurement_type === 'count' ? `Count (${habitData.target_value} ${habitData.target_unit})` :
                         `Duration (${habitData.target_value} ${habitData.target_unit})`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Skip Policy:</span>
                      <span className="text-white ml-2">
                        {habitData.allows_skips ? 'Flexible' : 'Strict'}
                      </span>
                    </div>
                  </div>
                  
                  {habitData.reminder_time && (
                    <div className="text-sm">
                      <span className="text-gray-400">Reminder:</span>
                      <span className="text-white ml-2">{habitData.reminder_time}</span>
                    </div>
                  )}
                </div>
                
                {errors.general && (
                  <p className="text-red-400 text-sm">{errors.general}</p>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={step === 'templates' ? onClose : handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              {step === 'templates' ? 'Cancel' : 'Back'}
            </button>
            
            {step === 'review' ? (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Habit'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}