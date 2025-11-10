import React, { useState } from 'react';
import type { Task } from '../../types/task-management';
import IntelligentSchedulingModal from './IntelligentSchedulingModal';

interface IntelligentSchedulingButtonProps {
  task: Task;
  onTaskUpdate?: () => void;
}

export default function IntelligentSchedulingButton({ task, onTaskUpdate }: IntelligentSchedulingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTaskScheduled = (scheduledTask: Task) => {
    setIsModalOpen(false);
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };

  const quickAutoSchedule = async () => {
    try {
      setLoading(true);
      
      // Direct auto-schedule without modal
      const response = await fetch('/api/tasks/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: task.id,
          approval_threshold: 0.8 // High confidence only
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.scheduled) {
          // Show success feedback
          showToast(`✅ ${task.title} scheduled for ${new Date(result.slot?.start_time || '').toLocaleString()}`, 'success');
          if (onTaskUpdate) onTaskUpdate();
        } else {
          // Open modal for manual selection
          setIsModalOpen(true);
          showToast('💭 Multiple options available - please choose', 'info');
        }
      } else {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Quick auto-schedule failed:', error);
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white max-w-md ${
      type === 'success' ? 'bg-green-600' : 
      type === 'error' ? 'bg-red-600' : 
      'bg-blue-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 4000);
  };

  // Only show for pending and in_progress tasks
  if (!['pending', 'in_progress'].includes(task.status)) {
    return null;
  }

  if (loading) {
    return (
      <div className="px-3 py-1 text-sm bg-surface border border-border text-text-secondary rounded cursor-not-allowed flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary mr-2"></div>
        <span className="text-xs">AI Scheduling...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-1">
        {/* Quick Auto-Schedule Button */}
        <button
          onClick={quickAutoSchedule}
          className="px-3 py-1 text-sm bg-gradient-to-r from-accent-purple to-accent-primary text-white rounded transition-all hover:from-accent-purple/90 hover:to-accent-primary/90 flex items-center"
          title="AI will automatically find the best time slot"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-medium">Auto-Schedule</span>
        </button>

        {/* Options Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-2 py-1 text-sm bg-surface border border-border text-text-secondary rounded hover:bg-surface-hover transition-colors"
          title="View all AI scheduling options"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Intelligent Scheduling Modal */}
      <IntelligentSchedulingModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskScheduled={handleTaskScheduled}
      />
    </>
  );
}