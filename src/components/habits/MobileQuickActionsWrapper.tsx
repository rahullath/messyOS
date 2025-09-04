// src/components/habits/MobileQuickActionsWrapper.tsx
import React, { useEffect } from 'react';
import MobileQuickActions from './MobileQuickActions';
import { useHabitQuickActions } from '../../hooks/useHabitQuickActions';

interface HabitsData {
  habits: Array<{
    id: string;
    name: string;
    type: 'build' | 'break' | 'maintain';
    measurement_type: 'boolean' | 'count' | 'duration';
    color: string;
    streak_count: number;
    allows_skips: boolean;
    completedToday: boolean;
  }>;
}

interface MobileQuickActionsWrapperProps {
  habitsData: HabitsData;
}

export default function MobileQuickActionsWrapper({ habitsData }: MobileQuickActionsWrapperProps) {
  const { habits, state, actions } = useHabitQuickActions(habitsData.habits);

  // Only show on mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      const container = document.getElementById('mobile-quick-actions');
      if (container) {
        container.style.display = isMobile ? 'block' : 'none';
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <MobileQuickActions
      habits={habits}
      onQuickLog={actions.quickLog}
      onBatchComplete={actions.batchComplete}
      onEnhancedLog={actions.enhancedLog}
      className="mb-6"
    />
  );
}