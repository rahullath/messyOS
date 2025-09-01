// src/components/onboarding/ProfileForm.tsx - Profile creation form component
import React, { useState } from 'react';

export interface ProfileFormData {
  fullName: string;
  timezone: string;
  preferredModules: string[];
}

interface ProfileFormProps {
  onSubmit: (data: ProfileFormData) => void;
  onBack?: () => void;
  initialData?: Partial<ProfileFormData>;
  isLoading?: boolean;
}

const AVAILABLE_MODULES = [
  {
    id: 'habits',
    name: 'Habits & Goals',
    description: 'Track daily habits, build streaks, achieve long-term goals',
    icon: '🎯',
    category: 'personal'
  },
  {
    id: 'tasks',
    name: 'Tasks & Projects',
    description: 'Manage work, personal projects, and deadlines',
    icon: '✅',
    category: 'productivity'
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    description: 'Monitor fitness, sleep, nutrition, and vital signs',
    icon: '❤️',
    category: 'health'
  },
  {
    id: 'finance',
    name: 'Finance & Investments',
    description: 'Track expenses, investments, and financial goals',
    icon: '💰',
    category: 'finance'
  },
  {
    id: 'content',
    name: 'Content & Learning',
    description: 'Track movies, books, courses, and learning progress',
    icon: '📚',
    category: 'entertainment'
  }
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' }
];

export default function ProfileForm({ onSubmit, onBack, initialData, isLoading }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: initialData?.fullName || '',
    timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferredModules: initialData?.preferredModules || ['habits', 'tasks', 'health', 'finance']
  });

  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.timezone) {
      newErrors.timezone = 'Please select your timezone';
    }

    if (formData.preferredModules.length === 0) {
      newErrors.preferredModules = 'Please select at least one module';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const toggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredModules: prev.preferredModules.includes(moduleId)
        ? prev.preferredModules.filter(id => id !== moduleId)
        : [...prev.preferredModules, moduleId]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-3xl font-bold text-white mb-2">Let's get to know you</h2>
        <p className="text-gray-300 text-lg">
          Tell us a bit about yourself to personalize your MessyOS experience
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              errors.fullName ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Enter your full name"
            disabled={isLoading}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-2">
            Timezone *
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
            className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              errors.timezone ? 'border-red-500' : 'border-gray-600'
            }`}
            disabled={isLoading}
          >
            <option value="">Select your timezone</option>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p className="mt-1 text-sm text-red-400">{errors.timezone}</p>
          )}
        </div>

        {/* Preferred Modules */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Which areas would you like to optimize? *
          </label>
          <p className="text-sm text-gray-400 mb-4">
            Select the modules you're interested in. You can change these later.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_MODULES.map((module) => (
              <label
                key={module.id}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  formData.preferredModules.includes(module.id)
                    ? 'border-cyan-500 bg-cyan-500/20'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.preferredModules.includes(module.id)}
                  onChange={() => !isLoading && toggleModule(module.id)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{module.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{module.name}</h3>
                    <p className="text-sm text-gray-400">{module.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          {errors.preferredModules && (
            <p className="mt-2 text-sm text-red-400">{errors.preferredModules}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-between pt-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
          ) : (
            <div></div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up...
              </>
            ) : (
              'Continue →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}