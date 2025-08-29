// src/components/dashboard/cards/QuickActionsCard.tsx - Quick Action Buttons
import React, { useState } from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
  shortcut?: string;
}

export default function QuickActionsCard() {
  const [isLogging, setIsLogging] = useState(false);

  const openAIAssistant = () => {
    // Open AI chat/logging interface
    setIsLogging(true);
    setTimeout(() => setIsLogging(false), 2000); // Mock loading
  };

  const startWorkout = () => {
    // Navigate to workout interface or start timer
    window.location.href = '/workouts';
  };

  const addExpense = () => {
    // Quick expense logging
    const amount = prompt('Quick expense amount (₹):');
    if (amount) {
      // Log expense via API
      fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_dump: `Quick expense: ₹${amount}`
        })
      });
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'log',
      label: 'Log Something',
      icon: '✨',
      color: 'bg-gradient-to-r from-messy-primary to-messy-secondary',
      action: openAIAssistant,
      shortcut: '⌘L'
    },
    {
      id: 'workout',
      label: 'Start Workout',
      icon: '💪',
      color: 'bg-messy-success',
      action: startWorkout,
      shortcut: '⌘W'
    },
    {
      id: 'expense',
      label: 'Add Expense',
      icon: '💳',
      color: 'bg-messy-warning',
      action: addExpense,
      shortcut: '⌘E'
    }
  ];

  return (
    <div className="messy-card h-32 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-messy-primary font-medium">Quick Actions</h3>
        <div className="text-messy-muted text-xs">⌘ shortcuts</div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={isLogging}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              action.id === 'log' 
                ? 'bg-gradient-to-r from-messy-primary to-messy-secondary text-black'
                : `${action.color} text-white`
            } ${isLogging && action.id === 'log' ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm">{action.icon}</span>
              <span className="font-medium text-sm">
                {isLogging && action.id === 'log' ? 'Opening AI...' : action.label}
              </span>
            </div>
            {action.shortcut && (
              <span className={`text-xs opacity-75 ${
                action.id === 'log' ? 'text-black' : 'text-white'
              }`}>
                {action.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Floating AI Status */}
      {isLogging && (
        <div className="absolute inset-0 bg-messy-card-bg bg-opacity-90 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-messy-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-messy-primary text-sm">Opening AI Assistant...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add keyboard shortcuts
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'l':
          e.preventDefault();
          // Trigger log action
          break;
        case 'w':
          e.preventDefault();
          // Trigger workout action
          break;
        case 'e':
          e.preventDefault();
          // Trigger expense action
          break;
      }
    }
  });
}