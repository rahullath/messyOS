// src/components/habits/ai/AIHabitsDashboard.tsx - Comprehensive AI Habits Dashboard
import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { tokenService } from '../../../lib/tokens/service';
import AIInsightsPanel from './AIInsightsPanel';
import NaturalLanguageLogger from './NaturalLanguageLogger';
import PersonalizedRecommendations from './PersonalizedRecommendations';
import OptimalConditionsAnalyzer from './OptimalConditionsAnalyzer';

interface AIHabitsDashboardProps {
  habits?: Array<{
    id: string;
    name: string;
    type: string;
    measurement_type: string;
  }>;
  className?: string;
}

export default function AIHabitsDashboard({ habits = [], className = '' }: AIHabitsDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'insights' | 'nlp' | 'recommendations' | 'conditions'>('insights');
  const [selectedHabit, setSelectedHabit] = useState<string>('');
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

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: '🧠', cost: 25 },
    { id: 'nlp', label: 'Natural Language', icon: '🤖', cost: 15 },
    { id: 'recommendations', label: 'Recommendations', icon: '💡', cost: 30 },
    { id: 'conditions', label: 'Optimal Conditions', icon: '🎯', cost: 20 }
  ];

  const selectedHabitData = habits.find(h => h.id === selectedHabit);

  if (!user) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Features Locked</h3>
        <p className="text-gray-600">Please log in to access AI-powered habit insights and features.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI-Powered Habit Intelligence</h2>
              <p className="text-gray-600">Get insights, recommendations, and smart logging powered by AI</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Token Balance</div>
            <div className="text-lg font-semibold text-gray-900">{tokenBalance.toLocaleString()}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                tokenBalance >= tab.cost 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {tab.cost}
              </span>
            </button>
          ))}
        </div>

        {/* Habit Selector for Conditions Tab */}
        {activeTab === 'conditions' && habits.length > 0 && (
          <div className="mt-4">
            <label htmlFor="habit-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select habit to analyze:
            </label>
            <select
              id="habit-select"
              value={selectedHabit}
              onChange={(e) => setSelectedHabit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Choose a habit...</option>
              {habits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'insights' && (
          <AIInsightsPanel />
        )}

        {activeTab === 'nlp' && (
          <NaturalLanguageLogger />
        )}

        {activeTab === 'recommendations' && (
          <PersonalizedRecommendations />
        )}

        {activeTab === 'conditions' && (
          <>
            {selectedHabit && selectedHabitData ? (
              <OptimalConditionsAnalyzer
                habitId={selectedHabit}
                habitName={selectedHabitData.name}
              />
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎯</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Habit</h4>
                <p className="text-gray-600">
                  Choose a habit from the dropdown above to analyze its optimal conditions for success.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>💡 AI features help you understand patterns and optimize your habits</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Powered by MessyOS AI</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}