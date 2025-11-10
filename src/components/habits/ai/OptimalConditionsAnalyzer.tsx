// src/components/habits/ai/OptimalConditionsAnalyzer.tsx - Optimal Conditions Analyzer Component
import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { tokenService } from '../../../lib/tokens/service';
import type { OptimalConditions } from '../../../lib/habits/ai-insights';

interface OptimalConditionsAnalyzerProps {
  habitId: string;
  habitName: string;
  className?: string;
}

export default function OptimalConditionsAnalyzer({ 
  habitId, 
  habitName, 
  className = '' 
}: OptimalConditionsAnalyzerProps) {
  const { user } = useAuth();
  const [conditions, setConditions] = useState<OptimalConditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  React.useEffect(() => {
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

  const analyzeConditions = async () => {
    if (!user) return;

    const tokenCost = 20; // Optimal conditions analysis cost
    if (tokenBalance < tokenCost) {
      setError('Insufficient tokens for optimal conditions analysis (need 20 tokens)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/habits/ai/optimal-conditions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ habitId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze optimal conditions');
      }

      setConditions(data.conditions);
      setTokenBalance(prev => prev - tokenCost);
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>🎯 Optimal conditions analyzed! Used ${tokenCost} tokens.</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

    } catch (error) {
      console.error('Error analyzing conditions:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze optimal conditions');
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: number) => {
    switch (mood) {
      case 1: return '😞';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '😊';
      case 5: return '😄';
      default: return '😐';
    }
  };

  const getEnergyEmoji = (energy: number) => {
    switch (energy) {
      case 1: return '🪫';
      case 2: return '🔋';
      case 3: return '🔋';
      case 4: return '⚡';
      case 5: return '⚡';
      default: return '🔋';
    }
  };

  if (!user) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">Please log in to analyze optimal conditions</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-gray-900">
              Optimal Conditions for {habitName}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Balance: <span className="font-medium">{tokenBalance.toLocaleString()}</span> tokens
            </div>
            <button
              onClick={analyzeConditions}
              disabled={loading || tokenBalance < 20}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Analyze (20 tokens)</span>
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

        {!conditions ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Discover Your Optimal Conditions</h4>
            <p className="text-gray-600 mb-4">
              Analyze your habit data to find the best times, moods, and contexts for success with {habitName}.
            </p>
            {tokenBalance >= 20 && (
              <button
                onClick={analyzeConditions}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
              >
                Analyze Conditions (20 tokens)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mood and Energy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conditions.bestMood && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{getMoodEmoji(conditions.bestMood)}</span>
                    <h4 className="font-medium text-blue-900">Optimal Mood</h4>
                  </div>
                  <p className="text-blue-800">
                    You're most successful when your mood is <strong>{conditions.bestMood}/5</strong>
                  </p>
                </div>
              )}

              {conditions.bestEnergyLevel && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{getEnergyEmoji(conditions.bestEnergyLevel)}</span>
                    <h4 className="font-medium text-green-900">Optimal Energy</h4>
                  </div>
                  <p className="text-green-800">
                    You perform best with <strong>{conditions.bestEnergyLevel}/5</strong> energy level
                  </p>
                </div>
              )}
            </div>

            {/* Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conditions.bestTimeOfDay && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">⏰</span>
                    <h4 className="font-medium text-purple-900">Best Time</h4>
                  </div>
                  <p className="text-purple-800">
                    Most successful around <strong>{conditions.bestTimeOfDay}</strong>
                  </p>
                </div>
              )}

              {conditions.bestDaysOfWeek.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">📅</span>
                    <h4 className="font-medium text-orange-900">Best Days</h4>
                  </div>
                  <p className="text-orange-800">
                    <strong>{conditions.bestDaysOfWeek.slice(0, 3).join(', ')}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Locations */}
            {conditions.optimalLocations.length > 0 && (
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📍</span>
                  <h4 className="font-medium text-indigo-900">Optimal Locations</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {conditions.optimalLocations.map((location, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                    >
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Weather */}
            {conditions.favorableWeather.length > 0 && (
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🌤️</span>
                  <h4 className="font-medium text-cyan-900">Favorable Weather</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {conditions.favorableWeather.map((weather, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm"
                    >
                      {weather}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Context Tags */}
            {conditions.successfulContextTags.length > 0 && (
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🏷️</span>
                  <h4 className="font-medium text-pink-900">Success Tags</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {conditions.successfulContextTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Analysis based on your successful habit entries</span>
                <button
                  onClick={analyzeConditions}
                  disabled={loading || tokenBalance < 20}
                  className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  Re-analyze
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}