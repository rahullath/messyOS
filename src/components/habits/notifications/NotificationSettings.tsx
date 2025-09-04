// src/components/habits/notifications/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { notificationService, HabitReminder, formatReminderTime, getDayNames } from '../../../lib/habits/notifications';

interface NotificationSettingsProps {
  habitId: string;
  habitName: string;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  habitId,
  habitName,
  onClose
}) => {
  const [reminder, setReminder] = useState<HabitReminder>({
    habitId,
    habitName,
    time: '09:00',
    enabled: false,
    days: [1, 2, 3, 4, 5] // Weekdays by default
  });
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load existing reminder
    const existingReminder = notificationService.getHabitReminder(habitId);
    if (existingReminder) {
      setReminder(existingReminder);
    }

    // Check permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [habitId]);

  const handlePermissionRequest = async () => {
    setIsLoading(true);
    const permission = await notificationService.requestPermission();
    setPermissionStatus(permission.granted ? 'granted' : permission.denied ? 'denied' : 'default');
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const success = await notificationService.updateHabitReminder(reminder);
    setIsLoading(false);
    
    if (success) {
      onClose();
    } else {
      alert('Failed to save notification settings. Please check your permissions.');
    }
  };

  const handleTestNotification = async () => {
    await notificationService.testNotification();
  };

  const toggleDay = (day: number) => {
    setReminder(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{habitName}</h4>
            <p className="text-sm text-gray-600">
              Set up reminders to help you stay consistent with this habit.
            </p>
          </div>

          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    {permissionStatus === 'denied' 
                      ? 'Notifications are blocked. Please enable them in your browser settings.'
                      : 'Notifications permission required for reminders.'
                    }
                  </p>
                  {permissionStatus === 'default' && (
                    <button
                      onClick={handlePermissionRequest}
                      disabled={isLoading}
                      className="mt-2 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 disabled:opacity-50"
                    >
                      {isLoading ? 'Requesting...' : 'Enable Notifications'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Enable Reminders
            </label>
            <button
              onClick={() => setReminder(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                reminder.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  reminder.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {reminder.enabled && (
            <>
              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Time
                </label>
                <input
                  type="time"
                  value={reminder.time}
                  onChange={(e) => setReminder(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll be reminded at {formatReminderTime(reminder.time)}
                </p>
              </div>

              {/* Days Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Days
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      className={`px-2 py-2 text-xs rounded-lg border transition-colors ${
                        reminder.days.includes(index)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {getDayNames(reminder.days)}
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setReminder(prev => ({ ...prev, days: [1, 2, 3, 4, 5] }))}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    Weekdays
                  </button>
                  <button
                    onClick={() => setReminder(prev => ({ ...prev, days: [0, 6] }))}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    Weekends
                  </button>
                  <button
                    onClick={() => setReminder(prev => ({ ...prev, days: [0, 1, 2, 3, 4, 5, 6] }))}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    Daily
                  </button>
                </div>
              </div>

              {/* Test Notification */}
              {permissionStatus === 'granted' && (
                <div>
                  <button
                    onClick={handleTestNotification}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Test Notification
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || (reminder.enabled && reminder.days.length === 0)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification status indicator component
export const NotificationIndicator: React.FC<{ habitId: string }> = ({ habitId }) => {
  const [hasReminder, setHasReminder] = useState(false);

  useEffect(() => {
    const reminder = notificationService.getHabitReminder(habitId);
    setHasReminder(reminder?.enabled || false);
  }, [habitId]);

  if (!hasReminder) return null;

  return (
    <div className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      Reminders On
    </div>
  );
};

// Global notification stats component
export const NotificationStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalReminders: 0,
    activeReminders: 0,
    permissionStatus: 'default'
  });

  useEffect(() => {
    const updateStats = () => {
      setStats(notificationService.getNotificationStats());
    };

    updateStats();
    
    // Update stats when storage changes
    const handleStorageChange = () => updateStats();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center mb-2">
        <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
        <h4 className="font-medium text-blue-900">Notification Status</h4>
      </div>
      <div className="text-sm text-blue-800 space-y-1">
        <p>Active reminders: {stats.activeReminders} of {stats.totalReminders}</p>
        <p>Permission: {stats.permissionStatus}</p>
      </div>
    </div>
  );
};