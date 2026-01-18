// src/components/dashboard/cards/DailyPlanCard.tsx
import React, { useEffect, useState } from 'react';

interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  activity_name: string;
  status: 'pending' | 'completed' | 'skipped';
}

interface DailyPlan {
  id: string;
  time_blocks: TimeBlock[];
}

export const DailyPlanCard: React.FC = () => {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysPlan();
  }, []);

  const fetchTodaysPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/daily-plan/today');
      
      if (!response.ok) {
        if (response.status === 404) {
          setPlan(null);
          return;
        }
        throw new Error('Failed to fetch daily plan');
      }

      const data = await response.json();
      setPlan(data);
    } catch (err) {
      console.error('Error fetching daily plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentActivity = (): TimeBlock | null => {
    if (!plan?.time_blocks) return null;
    return plan.time_blocks.find(block => block.status === 'pending') || null;
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (loading) {
    return (
      <a href="/daily-plan" className="card hover:bg-surface-hover transition-colors">
        <div className="flex items-center">
          <div className="text-3xl mr-4">⏰</div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Daily Plan</h3>
            <p className="text-text-secondary text-sm">Loading...</p>
          </div>
        </div>
      </a>
    );
  }

  if (error) {
    return (
      <a href="/daily-plan" className="card hover:bg-surface-hover transition-colors">
        <div className="flex items-center">
          <div className="text-3xl mr-4">⏰</div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Daily Plan</h3>
            <p className="text-text-secondary text-sm">Error loading plan</p>
          </div>
        </div>
      </a>
    );
  }

  const currentActivity = getCurrentActivity();

  if (!plan || !currentActivity) {
    return (
      <a href="/daily-plan" className="card hover:bg-surface-hover transition-colors">
        <div className="flex items-center">
          <div className="text-3xl mr-4">⏰</div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Daily Plan</h3>
            <p className="text-text-secondary text-sm">Generate today's plan</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href="/daily-plan" className="card hover:bg-surface-hover transition-colors">
      <div className="flex items-center">
        <div className="text-3xl mr-4">⏰</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary">Daily Plan</h3>
          <p className="text-text-secondary text-sm">
            {formatTime(currentActivity.start_time)} - {currentActivity.activity_name}
          </p>
        </div>
      </div>
    </a>
  );
};

export default DailyPlanCard;
