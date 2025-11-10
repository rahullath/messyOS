// src/components/dashboard/cards/AIInsightsCard.tsx - AI Insights & Patterns
import React, { useState, useEffect } from 'react';

interface Insight {
  id: string;
  type: 'correlation' | 'optimization' | 'alert' | 'achievement';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export default function AIInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock AI insights
    setTimeout(() => {
      setInsights([
        {
          id: '1',
          type: 'correlation',
          title: 'Sleep & Energy Pattern',
          description: 'You have 40% more energy on days when you sleep before 11 PM',
          confidence: 87,
          actionable: true
        },
        {
          id: '2',
          type: 'optimization',
          title: 'Workout Timing',
          description: 'Morning workouts lead to better habit completion rates',
          confidence: 73,
          actionable: true
        },
        {
          id: '3',
          type: 'alert',
          title: 'Spending Alert',
          description: 'Food delivery spending is 23% above normal this week',
          confidence: 95,
          actionable: true
        },
        {
          id: '4',
          type: 'achievement',
          title: 'Milestone Reached',
          description: 'Longest meditation streak - 15 days! 🎉',
          confidence: 100,
          actionable: false
        }
      ]);
      setIsLoading(false);
    }, 1100);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'correlation': return '🔗';
      case 'optimization': return '⚡';
      case 'alert': return '⚠️';
      case 'achievement': return '🏆';
      default: return '💡';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'correlation': return 'text-messy-primary';
      case 'optimization': return 'text-messy-success';
      case 'alert': return 'text-messy-warning';
      case 'achievement': return 'text-messy-secondary';
      default: return 'text-messy-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="messy-card h-64">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-messy-border rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-messy-border rounded"></div>
                  <div className="h-2 bg-messy-border rounded w-3/4"></div>
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
          <span className="text-lg">🧠</span>
          <h3 className="text-messy-primary font-medium">AI Insights</h3>
        </div>
        <div className="text-messy-muted text-xs">Weekly patterns</div>
      </div>
      
      <div className="space-y-4 max-h-48 messy-scrollbar overflow-y-auto">
        {insights.map((insight) => (
          <div key={insight.id} className="flex space-x-3 p-3 bg-messy-border bg-opacity-30 rounded-lg hover:bg-opacity-50 transition-colors">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                insight.type === 'alert' ? 'bg-messy-warning bg-opacity-20' :
                insight.type === 'achievement' ? 'bg-messy-secondary bg-opacity-20' :
                'bg-messy-primary bg-opacity-20'
              }`}>
                <span className="text-sm">{getInsightIcon(insight.type)}</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`font-medium text-sm ${getInsightColor(insight.type)}`}>
                  {insight.title}
                </h4>
                <span className="text-messy-muted text-xs">
                  {insight.confidence}%
                </span>
              </div>
              <p className="text-messy-secondary text-sm mb-2">
                {insight.description}
              </p>
              
              {insight.actionable && (
                <button className="messy-btn-ghost text-xs py-1 px-2">
                  Take Action
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}