// src/components/habits/ai/AIInsightsPanel.tsx - AI Insights Panel Component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { tokenService } from '../../../lib/tokens/service';
import type { HabitInsight } from '../../../lib/habits/ai-insights';

interface AIInsightsPanelProps {
  habitId?: string;
  className?: string;
}

export default function AIInsightsPanel({ habitId, className = '' }: AIInsightsPanelProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<HabitInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  useEffect(() => {
    if (user) {
      loadTokenBalance();
      loadExistingInsights();
    }
  }, [user, habitId]);

  const loadTokenBalance = async () => {
    if (!user) return;
    
    try {
      const balance = await tokenService.getTokenBalance(user.id);
      setTokenBalance(balance?.balance || 0);
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  };

  const loadExistingInsights = async () => {
    if (!user) return;

    try {
      const token = await user.session?.access_token;
      if (!token) return;

      const url = new URL('/api/habits/ai/insights', window.location.origin);
      if (habitId) {
        url.searchParams.set('habitId', habitId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error loading existing insights:', error);
    }
  };

  const generateInsights = async () => {
    if (!user) return;

    const tokenCost = 25; // Pattern analysis cost
    if (tokenBalance < tokenCost) {
      setShowTokenWarning(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/habits/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ habitId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate insights');
      }

      setInsights(data.insights);
      setTokenBalance(prev => prev - tokenCost);
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <span>✨ AI insights generated! Used ${tokenCost} tokens.</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

    } catch (error) {
      console.error('Error generating insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return '📊';
      case 'correlation':
        return '🔗';
      case 'trend':
        return '📈';
      case 'recommendation':
        return '💡';
      case 'optimal_conditions':
        return '🎯';
      default:
        return '✨';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'correlation':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'trend':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'recommendation':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'optimal_conditions':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">Please log in to access AI insights</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧠</span>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Balance: <span className="font-medium">{tokenBalance.toLocaleString()}</span> tokens
            </div>
            <button
              onClick={generateInsights}
              disabled={loading || tokenBalance < 25}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate Insights (25 tokens)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {showTokenWarning && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-500">💰</span>
                <p className="text-yellow-700">Insufficient tokens for AI insights (need 25 tokens)</p>
              </div>
              <button
                onClick={() => setShowTokenWarning(false)}
                className="text-yellow-500 hover:text-yellow-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔮</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h4>
              <p className="text-gray-600 mb-4">
                Generate AI-powered insights to understand your habit patterns and get personalized recommendations.
              </p>
              {tokenBalance >= 25 && (
                <button
                  onClick={generateInsights}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
                >
                  Get Started (25 tokens)
                </button>
              )}
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                        {insight.actionable && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Actionable
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {insights.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Insights refresh weekly or when you generate new ones</span>
              <button
                onClick={generateInsights}
                disabled={loading || tokenBalance < 25}
                className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
              >
                Refresh insights
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}