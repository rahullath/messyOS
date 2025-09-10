import React, { useState } from 'react';
import TaskCreationModal from './TaskCreationModal';
import TaskList from './TaskList';
import ActiveSessionsDebug from './ActiveSessionsDebug';
import type { Task } from '../../types/task-management';

interface TaskManagementProps {
  userId: string;
}

export default function TaskManagement({ userId }: TaskManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for the add task button click from the parent page
  React.useEffect(() => {
    const handleAddTaskClick = () => {
      setIsModalOpen(true);
    };

    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', handleAddTaskClick);
    }

    return () => {
      if (addTaskBtn) {
        addTaskBtn.removeEventListener('click', handleAddTaskClick);
      }
    };
  }, []);

  const handleTaskCreated = (task: Task) => {
    // Trigger a refresh of the task list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskUpdate = (task: Task) => {
    // Task was updated, could trigger refresh if needed
    // For now, the TaskList component handles updates internally
  };

  return (
    <div className="w-full">
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
