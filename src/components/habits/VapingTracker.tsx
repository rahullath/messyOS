// ========================================
// COMPREHENSIVE FIXES FOR PERSONAL USE
// ========================================

// 1. Fix Vaping Habit Tracking (Puff Counter)
// src/components/habits/VapingTracker.tsx

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';

interface VapingTrackerProps {
  habit: any;
  todayEntry: any;
  onUpdate: () => void;
}

export default function VapingTracker({ habit, todayEntry, onUpdate }: VapingTrackerProps) {
  const [puffCount, setPuffCount] = useState(todayEntry?.value || 0);
  const [loading, setLoading] = useState(false);

  const logPuffs = async (count: number) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // For vaping: 0 puffs = success (1), any puffs = failure (0)
      const success = count === 0 ? 1 : 0;
      
      const { error } = await supabase
        .from('habit_entries')
        .upsert({
          habit_id: habit.id,
          user_id: habit.user_id,
          date: today,
          value: success, // Store success/failure
          raw_value: count, // Store actual puff count
          logged_at: new Date().toISOString(),
          notes: count === 0 ? 'Vape-free day!' : `${count} puffs today`
        });

      if (error) throw error;
      
      setPuffCount(count);
      onUpdate();
    } catch (error) {
      console.error('Error logging puffs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-3">🚭 Vaping Tracker</h3>
      
      <div className="flex items-center space-x-4 mb-4">
        <span className="text-gray-300">Today's Puffs:</span>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => puffCount > 0 && logPuffs(puffCount - 1)}
            className="w-8 h-8 bg-red-600 text-white rounded-full"
            disabled={loading || puffCount === 0}
          >
            -
          </button>
          <span className="text-2xl font-bold text-white w-12 text-center">
            {puffCount}
          </span>
          <button 
            onClick={() => logPuffs(puffCount + 1)}
            className="w-8 h-8 bg-red-600 text-white rounded-full"
            disabled={loading}
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[0, 3, 5, 10].map(count => (
          <button
            key={count}
            onClick={() => logPuffs(count)}
            className={`py-2 px-3 rounded text-sm font-medium ${
              count === 0 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={loading}
          >
            {count === 0 ? 'Clean Day' : `${count} puffs`}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-400">
        <p>Current streak: {habit.realCurrentStreak || 0} days</p>
        <p>Best streak: {habit.best_streak || 0} days</p>
      </div>
    </div>
  );
}