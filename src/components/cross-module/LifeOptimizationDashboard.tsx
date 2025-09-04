// Life Optimization Dashboard - Main cross-module integration component
import React, { useState, useEffect } from 'react';
// Using CSS animations instead of framer-motion for better build compatibility
import type { LifeOptimizationScore, ModuleStats, CrossModuleInsight } from '../../types/cross-module';
import { LifeScoreChart } from './LifeScoreChart';
import { ModuleStatsGrid } from './ModuleStatsGrid';
import { AchievementCelebration } from './AchievementCelebration';
import { CrossModuleInsights } from './CrossModuleInsights';
import { ProgressSharing } from './ProgressSharing';

interface LifeOptimizationDashboardProps {
  userId: string;
  authToken: string;
}

export const LifeOptimizationDashboard: React.FC<LifeOptimizationDashboardProps> = ({
  userId,
  authToken
}) => {
  const [currentScore, setCurrentScore] = useState<LifeOptimizationScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<LifeOptimizationScore[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStats | null>(null);
  const [insights, setInsights] = useState<CrossModuleInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current score and history
      const [currentResponse, historyResponse, statsResponse, correlationsResponse] = await Promise.all([
        fetch('/api/cross-module/life-score', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('/api/cross-module/life-score?history=true&days=30', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('/api/cross-module/stats', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('/api/cross-module/correlations', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      if (!currentResponse.ok || !historyResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const currentData = await currentResponse.json();
      const historyData = await historyResponse.json();
      
      setCurrentScore(currentData.data);
      setScoreHistory(historyData.data);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setModuleStats(statsData.data);
      }

      if (correlationsResponse.ok) {
        const correlationsData = await correlationsResponse.json();
        setInsights(correlationsData.insights || []);
      }

      // Check for new achievements
      checkForNewAchievements();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const response = await fetch('/api/cross-module/achievements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'check' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.new_achievements && data.new_achievements.length > 0) {
          setShowCelebration(true);
        }
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  const recalculateScore = async () => {
    try {
      const response = await fetch('/api/cross-module/life-score', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentScore(data.data);
        
        // Refresh history
        const historyResponse = await fetch('/api/cross-module/life-score?history=true&days=30', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setScoreHistory(historyData.data);
        }
      }
    } catch (error) {
      console.error('Failed to recalculate score:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Achievement Celebration */}
      <AnimatePresence>
        {showCelebration && (
          <AchievementCelebration
            onClose={() => setShowCelebration(false)}
            authToken={authToken}
          />
        )}
      </AnimatePresence>

      {/* Life Optimization Score Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Life Optimization Score</h1>
            <p className="text-purple-100">
              Your overall progress across all life areas
            </p>
          </div>
          <div className="text-right">
            <div className={`text-6xl font-bold ${getScoreColor(currentScore?.overall_score || 0)}`}>
              {Math.round(currentScore?.overall_score || 0)}
            </div>
            <div className="text-purple-200 text-sm">out of 100</div>
          </div>
        </div>

        {/* Score Breakdown */}
        {currentScore && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(currentScore.habits_score)}</div>
              <div className="text-purple-200 text-sm">Habits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(currentScore.tasks_score)}</div>
              <div className="text-purple-200 text-sm">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(currentScore.health_score)}</div>
              <div className="text-purple-200 text-sm">Health</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(currentScore.productivity_score)}</div>
              <div className="text-purple-200 text-sm">Productivity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(currentScore.content_score)}</div>
              <div className="text-purple-200 text-sm">Content</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={recalculateScore}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Recalculate Score
          </button>
        </div>
      </div>

      {/* Score Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Score Trends</h2>
        <LifeScoreChart scores={scoreHistory} />
      </div>

      {/* Module Stats Grid */}
      {moduleStats && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Module Overview</h2>
          <ModuleStatsGrid stats={moduleStats} />
        </div>
      )}

      {/* Cross-Module Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Cross-Module Insights</h2>
          <CrossModuleInsights insights={insights} />
        </div>
      )}

      {/* Progress Sharing */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Share Your Progress</h2>
        <ProgressSharing
          userId={userId}
          authToken={authToken}
          currentScore={currentScore}
        />
      </div>
    </div>
  );
};
