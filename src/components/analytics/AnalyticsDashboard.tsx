import React, { useState, useEffect } from 'react';
import type { Task, TimeSession, Goal } from '../../types/task-management';
import { TaskService } from '../../lib/task-management/task-service';
import { TimeTrackingService } from '../../lib/task-management/time-tracking-service';
import { GoalService } from '../../lib/task-management/task-service';

interface AnalyticsDashboardProps {
  userId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [tasksResponse, goalsResponse] = await Promise.all([
        TaskService.getTasks(userId),
        GoalService.getGoals(userId),
      ]);
      setTasks(tasksResponse.tasks);
      setGoals(goalsResponse);

      // Fetch time sessions for all tasks
      const sessions = await Promise.all(
        tasksResponse.tasks.map(task => TimeTrackingService.getSessionsForTask(userId, task.id))
      );
      setTimeSessions(sessions.flat());
    };

    fetchData();
  }, [userId]);

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTimeSpent = timeSessions.reduce((acc, session) => acc + (session.actual_duration || 0), 0);
  const averageProductivity = timeSessions.length > 0
    ? timeSessions.reduce((acc, session) => acc + (session.productivity_rating || 0), 0) / timeSessions.length
    : 0;

  return (
    <div className="analytics-dashboard">
      <h1>Analytics Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h2>Tasks Completed</h2>
          <p>{completedTasks} / {tasks.length}</p>
        </div>
        <div className="stat-card">
          <h2>Total Time Spent</h2>
          <p>{(totalTimeSpent / 60).toFixed(2)} hours</p>
        </div>
        <div className="stat-card">
          <h2>Average Productivity</h2>
          <p>{averageProductivity.toFixed(2)} / 10</p>
        </div>
        <div className="stat-card">
          <h2>Goals in Progress</h2>
          <p>{goals.filter(goal => goal.status === 'active').length}</p>
        </div>
      </div>
      {/* Add charts and visualizations here */}
    </div>
  );
};
