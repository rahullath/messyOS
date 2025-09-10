import React, { useState } from 'react';
import type { Task } from '../../types/task-management';

interface BatchSchedulingButtonProps {
  tasks: Task[];
  onTasksUpdated: () => void;
}

export default function BatchSchedulingButton({ tasks, onTasksUpdated }: BatchSchedulingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  // Only show if there are multiple unscheduled tasks
  const unscheduledTasks = tasks.filter(task => 
    ['pending', 'in_progress'].includes(task.status)
  );

  if (unscheduledTasks.length < 2) {
    return null;
  }

  const batchAutoSchedule = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/tasks/auto-schedule', {
        method: 'PUT', // Using PUT for batch operation
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_ids: unscheduledTasks.map(task => task.id),
          approval_threshold: 0.7,
          prioritize_by: 'ai_ranking'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result.summary);
        
        showToast(`🚀 ${result.summary}`, 'success');
        onTasksUpdated();
      } else {
        throw new Error('Batch scheduling failed');
      }
      
    } catch (error) {
      console.error('Batch auto-schedule failed:', error);
      showToast('❌ Batch scheduling failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 text-white max-w-md ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-accent-purple to-accent-primary text-white px-4 py-2 rounded-lg flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
        <span className="text-sm font-medium">AI scheduling {unscheduledTasks.length} tasks...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={batchAutoSchedule}
        className="bg-gradient-to-r from-accent-purple to-accent-primary text-white px-4 py-2 rounded-lg hover:from-accent-purple/90 hover:to-accent-primary/90 transition-all flex items-center shadow-lg"
        title={`Auto-schedule all ${unscheduledTasks.length} unscheduled tasks using AI`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-medium">Auto-Schedule All ({unscheduledTasks.length})</span>
      </button>
      
      {lastResult && (
        <div className="text-sm text-text-muted bg-surface/50 px-3 py-1 rounded">
          {lastResult}
        </div>
      )}
    </div>
  );
}