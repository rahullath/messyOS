// src/components/dashboard/cards/ActivityFeedCard.tsx - Recent Activity Feed
import React, { useState, useEffect } from 'react';

interface ActivityItem {
  id: string;
  type: 'habit' | 'task' | 'nutrition' | 'expense' | 'achievement' | 'system';
  description: string;
  timestamp: string;
  value?: string;
  icon: string;
}

export default function ActivityFeedCard() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock activity data
    setTimeout(() => {
      setActivities([
        {
          id: '1',
          type: 'habit',
          description: 'Completed morning workout',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          value: '45 min',
          icon: '💪'
        },
        {
          id: '2',
          type: 'nutrition',
          description: 'Logged lunch',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          value: '520 cal',
          icon: '🍽️'
        },
        {
          id: '3',
          type: 'achievement',
          description: 'Meditation streak milestone',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          value: '15 days',
          icon: '🏆'
        },
        {
          id: '4',
          type: 'task',
          description: 'Completed weekly planning',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          icon: '✅'
        },
        {
          id: '5',
          type: 'expense',
          description: 'Coffee at Starbucks',
          timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          value: '₹450',
          icon: '☕'
        },
        {
          id: '6',
          type: 'system',
          description: 'Data sync completed',
          timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
          icon: '🔄'
        }
      ]);
      setIsLoading(false);
    }, 1200);
  }, []);

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'habit': return 'text-messy-success';
      case 'task': return 'text-messy-primary';
      case 'nutrition': return 'text-messy-warning';
      case 'expense': return 'text-messy-error';
      case 'achievement': return 'text-messy-secondary';
      case 'system': return 'text-messy-muted';
      default: return 'text-messy-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="messy-card h-64">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-6 h-6 bg-messy-border rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-messy-border rounded"></div>
                  <div className="h-2 bg-messy-border rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-64">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📜</span>
          <h3 className="text-messy-primary font-medium">Recent Activity</h3>
        </div>
        <button className="text-messy-secondary hover:text-messy-primary transition-colors text-xs">
          Clear
        </button>
      </div>
      
      <div className="space-y-3 max-h-48 messy-scrollbar overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 group">
            <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm ${
              activity.type === 'achievement' ? 'bg-messy-secondary bg-opacity-20' :
              activity.type === 'habit' ? 'bg-messy-success bg-opacity-20' :
              'bg-messy-primary bg-opacity-20'
            }`}>
              <span>{activity.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${getActivityColor(activity.type)}`}>
                  {activity.description}
                </span>
                {activity.value && (
                  <span className="text-messy-muted text-xs font-medium">
                    {activity.value}
                  </span>
                )}
              </div>
              <div className="text-messy-muted text-xs">
                {getTimeAgo(activity.timestamp)}
              </div>
            </div>
            
            <button className="opacity-0 group-hover:opacity-100 text-messy-muted hover:text-messy-error transition-all text-xs">
              ×
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button className="messy-btn-ghost text-xs py-1 px-3">
          View All Activity
        </button>
      </div>
    </div>
  );
}