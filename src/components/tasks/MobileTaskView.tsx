import React, { useState } from 'react';
import type { Task } from '../../types/task-management';
import '../../styles/mobile.css'; // Assuming a mobile-specific stylesheet

interface MobileTaskViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export const MobileTaskView: React.FC<MobileTaskViewProps> = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}) => {
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);

  const handleSwipe = (taskId: string) => {
    setSwipedTaskId(swipedTaskId === taskId ? null : taskId);
  };

  return (
    <div className="mobile-task-view">
      {tasks.map(task => (
        <div
          key={task.id}
          className={`task-item ${swipedTaskId === task.id ? 'swiped' : ''}`}
          onClick={() => handleSwipe(task.id)}
        >
          <div className="task-content">
            <div className="task-title">{task.title}</div>
            <div className="task-category">{task.category}</div>
          </div>
          <div className="task-actions">
            <button onClick={() => onCompleteTask(task.id)} className="action-complete">
              ✓
            </button>
            <button onClick={() => onDeleteTask(task.id)} className="action-delete">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
