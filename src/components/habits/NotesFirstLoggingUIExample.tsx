/**
 * Example usage of NotesFirstLoggingUI component
 * 
 * This demonstrates how to integrate the notes-first logging UI
 * with the habit logging API.
 */

import React, { useState } from 'react';
import NotesFirstLoggingUI from './NotesFirstLoggingUI';
import type { Habit } from '../../types/habits';

interface NotesFirstLoggingUIExampleProps {
  habit: Habit;
  onSuccess?: () => void;
}

export default function NotesFirstLoggingUIExample({
  habit,
  onSuccess
}: NotesFirstLoggingUIExampleProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Handle habit logging with notes
   * Wires to the enhanced logging API endpoint
   */
  const handleLogHabit = async (notes: string, value: number = 1) => {
    try {
      const response = await fetch(`/api/habits/${habit.id}/log-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          notes,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log habit');
      }

      // Success - close modal and notify parent
      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Re-throw to let NotesFirstLoggingUI handle the error display
      throw error;
    }
  };

  return (
    <div>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Log with Notes
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Log: {habit.name}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Use chips to quickly compose structured notes, or add free-form text.
              </p>

              <NotesFirstLoggingUI
                habit={habit}
                onSubmit={handleLogHabit}
                onCancel={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
