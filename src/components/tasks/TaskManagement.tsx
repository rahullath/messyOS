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
    <div className="max-w-6xl mx-auto">
      {/* Removed duplicate header - using the one from tasks.astro */}

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
