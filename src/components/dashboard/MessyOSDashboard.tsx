// src/components/dashboard/MessyOSDashboard.tsx - Main MessyOS Dashboard
import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import HealthPulseCard from './cards/HealthPulseCard';
import TodaysProgressCard from './cards/TodaysProgressCard';
import QuickActionsCard from './cards/QuickActionsCard';
import HabitsOverviewCard from './cards/HabitsOverviewCard';
import NutritionDashboardCard from './cards/NutritionDashboardCard';
import TasksFocusCard from './cards/TasksFocusCard';
import MoneyOverviewCard from './cards/MoneyOverviewCard';
import ContentQueueCard from './cards/ContentQueueCard';
import AIInsightsCard from './cards/AIInsightsCard';
import ActivityFeedCard from './cards/ActivityFeedCard';
import RightSidebar from './RightSidebar';

export default function MessyOSDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setShowRightSidebar(window.innerWidth >= 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load initial dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      // Simulate loading time for smooth experience
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsLoading(false);
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Header */}
      <DashboardHeader />

      {/* Main Layout */}
      <div className="pt-16"> {/* Account for fixed header */}
        <div className="flex">
          {/* Main Content Area */}
          <main className={`flex-1 transition-all duration-300 ${
            showRightSidebar && !isMobile ? 'mr-80' : 'mr-0'
          }`}>
            <div className="p-4 lg:p-6">
              {/* 12-Column Grid Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                
                {/* Row 1: Critical Metrics (Always Visible) */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                  <div className="lg:col-span-3">
                    <HealthPulseCard />
                  </div>
                  <div className="lg:col-span-6">
                    <TodaysProgressCard />
                  </div>
                  <div className="lg:col-span-3">
                    <QuickActionsCard />
                  </div>
                </div>

                {/* Row 2: Core Modules (Customizable Order) */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                  <div className="lg:col-span-4">
                    <HabitsOverviewCard />
                  </div>
                  <div className="lg:col-span-4">
                    <NutritionDashboardCard />
                  </div>
                  <div className="lg:col-span-4">
                    <TasksFocusCard />
                  </div>
                </div>

                {/* Row 3: Financial & Analytics */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                  <div className="lg:col-span-6">
                    <MoneyOverviewCard />
                  </div>
                  <div className="lg:col-span-6">
                    <ContentQueueCard />
                  </div>
                </div>

                {/* Row 4: AI Insights & Patterns */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                  <div className="lg:col-span-8">
                    <AIInsightsCard />
                  </div>
                  <div className="lg:col-span-4">
                    <ActivityFeedCard />
                  </div>
                </div>

              </div>
            </div>
          </main>

          {/* Right Sidebar (Desktop Only) */}
          {showRightSidebar && !isMobile && (
            <RightSidebar />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-messy-card-bg backdrop-blur-lg border-t border-messy-border z-50">
          <div className="flex justify-around items-center h-16 px-4">
            <button className="flex flex-col items-center space-y-1 text-messy-text-secondary hover:text-messy-primary transition-colors">
              <span className="text-xl">🏠</span>
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-messy-text-secondary hover:text-messy-primary transition-colors">
              <span className="text-xl">📊</span>
              <span className="text-xs">Analytics</span>
            </button>
            <button className="flex flex-col items-center space-y-1 bg-messy-primary text-black rounded-full p-2">
              <span className="text-xl">✨</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-messy-text-secondary hover:text-messy-primary transition-colors">
              <span className="text-xl">🎯</span>
              <span className="text-xs">Goals</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-messy-text-secondary hover:text-messy-primary transition-colors">
              <span className="text-xl">⚙️</span>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading Skeleton Component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white animate-pulse">
      {/* Header Skeleton */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-messy-card-bg backdrop-blur-lg border-b border-messy-border z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="w-32 h-8 bg-messy-border rounded"></div>
          <div className="flex items-center space-x-4">
            <div className="w-24 h-8 bg-messy-border rounded"></div>
            <div className="w-8 h-8 bg-messy-border rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="pt-16 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Row 1 Skeleton */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 h-32 bg-messy-card-bg rounded-lg"></div>
            <div className="lg:col-span-6 h-32 bg-messy-card-bg rounded-lg"></div>
            <div className="lg:col-span-3 h-32 bg-messy-card-bg rounded-lg"></div>
          </div>
          
          {/* Row 2 Skeleton */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 h-48 bg-messy-card-bg rounded-lg"></div>
            <div className="lg:col-span-4 h-48 bg-messy-card-bg rounded-lg"></div>
            <div className="lg:col-span-4 h-48 bg-messy-card-bg rounded-lg"></div>
          </div>

          {/* Row 3 Skeleton */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 h-40 bg-messy-card-bg rounded-lg"></div>
            <div className="lg:col-span-6 h-40 bg-messy-card-bg rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}