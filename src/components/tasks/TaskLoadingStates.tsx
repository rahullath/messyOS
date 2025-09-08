import React from 'react';

export const TaskListSkeleton: React.FC = () => (
  <div className="task-list-skeleton">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton-task-item">
        <div className="skeleton-task-title" />
        <div className="skeleton-task-category" />
      </div>
    ))}
  </div>
);

export const AnalyticsDashboardSkeleton: React.FC = () => (
  <div className="analytics-dashboard-skeleton">
    <div className="skeleton-header" />
    <div className="stats-grid-skeleton">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-stat-card" />
      ))}
    </div>
  </div>
);

export const FullPageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="full-page-loader">
    <div className="spinner" />
    <p>{message}</p>
  </div>
);
