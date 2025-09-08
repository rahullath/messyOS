import React, { useState } from 'react';
import TaskCreationModal from './TaskCreationModal';
import TaskList from './TaskList';
import type { Task } from '../../types/task-management';

interface TaskManagementProps {
  userId: string;
}

export default function TaskManagement({ userId }: TaskManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = (task: Task) => {
    // Trigger a refresh of the task list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskUpdate = (task: Task) => {
    // Task was updated, could trigger refresh if needed
    // For now, the TaskList component handles updates internally
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">
            Create, organize, and track your tasks efficiently
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* Task List */}
      <TaskList 
        userId={userId}
        refreshTrigger={refreshTrigger}
        onTaskUpdate={handleTaskUpdate}
      />

      {/* Task Creation Modal */}
      <TaskCreationModal
        userId={userId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
