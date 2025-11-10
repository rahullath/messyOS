// src/components/dashboard/cards/TasksFocusCard.tsx - Tasks & Focus Overview
import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_time?: string;
  completed: boolean;
  estimated_minutes?: number;
}

export default function TasksFocusCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [focusTimer, setFocusTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setTasks([
        { id: '1', title: 'Review nutrition tracking system', priority: 'high', due_time: '2:00 PM', completed: false, estimated_minutes: 30 },
        { id: '2', title: 'Plan weekend workout routine', priority: 'medium', completed: false, estimated_minutes: 15 },
        { id: '3', title: 'Update expense categories', priority: 'low', completed: true, estimated_minutes: 10 },
        { id: '4', title: 'Meal prep planning', priority: 'medium', due_time: '6:00 PM', completed: false, estimated_minutes: 20 }
      ]);
      setIsLoading(false);
    }, 800);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-messy-error';
      case 'medium': return 'text-messy-warning';
      case 'low': return 'text-messy-success';
      default: return 'text-messy-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="messy-card h-48">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-messy-border rounded"></div>
                <div className="flex-1 h-3 bg-messy-border rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedToday = tasks.filter(t => t.completed).length;
  const weeklyProductivity = 87; // Mock productivity score

  return (
    <div className="messy-card h-48">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📋</span>
          <h3 className="text-messy-primary font-medium">Tasks & Focus</h3>
        </div>
        <div className="text-center">
          <div className="text-messy-success font-bold text-sm">{weeklyProductivity}%</div>
          <div className="text-messy-muted text-xs">weekly</div>
        </div>
      </div>

      {/* Active Task Timer */}
      {activeTask && (
        <div className="bg-messy-primary bg-opacity-10 border border-messy-primary rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-messy-primary rounded-full animate-pulse"></div>
              <span className="text-messy-primary text-sm font-medium">
                {activeTask.title.slice(0, 25)}...
              </span>
            </div>
            <span className="text-messy-primary font-mono text-sm">
              {Math.floor(focusTimer / 60)}:{(focusTimer % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* Today's Top Tasks */}
      <div className="space-y-2 mb-3">
        {pendingTasks.slice(0, 3).map((task) => (
          <div key={task.id} className="flex items-center space-x-3 group">
            <button
              className="w-4 h-4 border border-messy-border rounded hover:border-messy-primary transition-colors"
              onClick={() => setTasks(prev => prev.map(t => 
                t.id === task.id ? { ...t, completed: true } : t
              ))}
            >
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  task.priority === 'high' ? 'bg-messy-error' :
                  task.priority === 'medium' ? 'bg-messy-warning' :
                  'bg-messy-success'
                }`}></span>
                <span className="text-messy-secondary text-sm truncate">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-messy-muted">
                {task.estimated_minutes && (
                  <span>{task.estimated_minutes}min</span>
                )}
                {task.due_time && (
                  <span>• {task.due_time}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTask(task)}
              className="opacity-0 group-hover:opacity-100 messy-btn-ghost text-xs py-1 px-2 transition-opacity"
            >
              Start
            </button>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-messy-secondary">
          {completedToday} completed today
        </span>
        <span className="text-messy-muted">
          {pendingTasks.length} remaining
        </span>
      </div>
    </div>
  );
}