// src/components/habits/ai/PersonalizedRecommendations.tsx - Personalized Recommendations Component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { tokenService } from '../../../lib/tokens/service';
import type { PersonalizedRecommendation } from '../../../lib/habits/ai-insights';

interface PersonalizedRecommendationsProps {
  className?: string;
}

export default function PersonalizedRecommendations({ className = '' }: PersonalizedRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      loadTokenBalance();
    }
  }, [user]);

  const loadTokenBalance = async () => {
    if (!user) return;
    
    try {
      const balance = await tokenService.getTokenBalance(user.id);
      setTokenBalance(balance?.balance || 0);
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;

    const tokenCost = 30; // Personalized recommendations cost
    if (tokenBalance < tokenCost) {
      setError('Insufficient tokens for personalized recommendations (need 30 tokens)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/habits/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setRecommendations(data.recommendations);
      setTokenBalance(prev => prev - tokenCost);
      setLastGenerated(new Date());
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <span>💡 ${data.recommendations.length} recommendations generated! Used ${tokenCost} tokens.</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'timing':
        return '⏰';
      case 'context':
        return '🌟';
      case 'approach':
        return '🎯';
      case 'goal':
        return '🚀';
      default:
        return '💡';
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'timing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'context':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'approach':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'goal':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const dismissRecommendation = (index: number) => {
    setRecommendations(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">Please log in to access personalized recommendations</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-semibold text-gray-900">Personalized Recommendations</h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Balance: <span className="font-medium">{tokenBalance.toLocaleString()}</span> tokens
            </div>
            <button
              onClick={generateRecommendations}
              disabled={loading || tokenBalance < 30}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🎯</span>
                  <span>Get Recommendations (30 tokens)</span>
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

        {lastGenerated && (
          <div className="mb-4 text-sm text-gray-600">
            Last generated: {lastGenerated.toLocaleString()}
          </div>
        )}

        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎯</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h4>
              <p className="text-gray-600 mb-4">
                Get personalized recommendations based on your habit patterns and performance data.
              </p>
              {tokenBalance >= 30 && (
                <button
                  onClick={generateRecommendations}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
                >
                  Get Recommendations (30 tokens)
                </button>
              )}
            </div>
          ) : (
            recommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getRecommendationColor(recommendation.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-2xl">{getRecommendationIcon(recommendation.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{recommendation.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                            {Math.round(recommendation.confidence * 100)}% confidence
                          </span>
                          {recommendation.actionable && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              Actionable
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                            {recommendation.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{recommendation.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissRecommendation(index)}
                    className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Dismiss recommendation"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Recommendations are personalized based on your habit data</span>
              <button
                onClick={generateRecommendations}
                disabled={loading || tokenBalance < 30}
                className="text-orange-600 hover:text-orange-700 disabled:opacity-50"
              >
                Refresh recommendations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}