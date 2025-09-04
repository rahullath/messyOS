// Module statistics grid component
import React from 'react';
import { motion } from 'framer-motion';
import type { ModuleStats } from '../../types/cross-module';

interface ModuleStatsGridProps {
  stats: ModuleStats;
}

export const ModuleStatsGrid: React.FC<ModuleStatsGridProps> = ({ stats }) => {
  const modules = [
    {
      name: 'Habits',
      icon: '🎯',
      color: 'from-green-500 to-emerald-600',
      stats: [
        { label: 'Active Habits', value: stats.habits.active, suffix: '' },
        { label: 'Completed Today', value: stats.habits.completed_today, suffix: '' },
        { label: 'Completion Rate', value: Math.round(stats.habits.completion_rate), suffix: '%' },
        { label: 'Best Streak', value: stats.habits.best_streak, suffix: ' days' }
      ]
    },
    {
      name: 'Tasks',
      icon: '✅',
      color: 'from-blue-500 to-cyan-600',
      stats: [
        { label: 'Total Tasks', value: stats.tasks.total, suffix: '' },
        { label: 'Completed', value: stats.tasks.completed, suffix: '' },
        { label: 'In Progress', value: stats.tasks.in_progress, suffix: '' },
        { label: 'Completion Rate', value: Math.round(stats.tasks.completion_rate), suffix: '%' }
      ]
    },
    {
      name: 'Health',
      icon: '❤️',
      color: 'from-red-500 to-pink-600',
      stats: [
        { label: 'Metrics Tracked', value: stats.health.metrics_count, suffix: '' },
        { label: 'Average Score', value: Math.round(stats.health.avg_score), suffix: '' },
        { label: 'Trend', value: stats.health.trend, suffix: '' },
        { label: 'Status', value: stats.health.avg_score > 70 ? 'Good' : 'Needs Attention', suffix: '' }
      ]
    },
    {
      name: 'Productivity',
      icon: '⚡',
      color: 'from-yellow-500 to-orange-600',
      stats: [
        { label: 'Focus Time', value: Math.round(stats.productivity.focus_time), suffix: ' min' },
        { label: 'Tasks/Day', value: Math.round(stats.productivity.tasks_per_day * 10) / 10, suffix: '' },
        { label: 'Efficiency', value: Math.round(stats.productivity.efficiency_score), suffix: '%' },
        { label: 'Status', value: stats.productivity.efficiency_score > 70 ? 'High' : 'Moderate', suffix: '' }
      ]
    },
    {
      name: 'Content',
      icon: '📚',
      color: 'from-purple-500 to-indigo-600',
      stats: [
        { label: 'Items Consumed', value: stats.content.consumed, suffix: '' },
        { label: 'Completed', value: stats.content.completed, suffix: '' },
        { label: 'Average Rating', value: Math.round(stats.content.avg_rating * 10) / 10, suffix: '/5' },
        { label: 'Completion Rate', value: Math.round((stats.content.completed / Math.max(stats.content.consumed, 1)) * 100), suffix: '%' }
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {modules.map((module, index) => (
        <motion.div
          key={module.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${module.color} p-4 text-white`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{module.icon}</span>
              <h3 className="font-semibold">{module.name}</h3>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 space-y-3">
            {module.stats.map((stat, statIndex) => (
              <div key={statIndex} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{stat.label}</span>
                <span className="font-semibold text-gray-900">
                  {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                  {stat.suffix}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar (for completion rates) */}
          {module.stats.find(s => s.label.includes('Rate')) && (
            <div className="px-4 pb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${module.color} h-2 rounded-full transition-all duration-500`}
                  style={{
                    width: `${Math.min(100, Math.max(0, 
                      module.stats.find(s => s.label.includes('Rate'))?.value || 0
                    ))}%`
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};