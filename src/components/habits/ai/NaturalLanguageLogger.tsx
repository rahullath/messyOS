// src/components/habits/ai/NaturalLanguageLogger.tsx - Natural Language Habit Logger
import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { tokenService } from '../../../lib/tokens/service';
import type { ParsedHabitLog } from '../../../lib/habits/ai-insights';

interface NaturalLanguageLoggerProps {
  onLogsGenerated?: (logs: ParsedHabitLog[]) => void;
  className?: string;
}

export default function NaturalLanguageLogger({ onLogsGenerated, className = '' }: NaturalLanguageLoggerProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedLogs, setParsedLogs] = useState<ParsedHabitLog[]>([]);
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

  const parseInput = async () => {
    if (!user || !input.trim()) return;

    const tokenCost = 15; // Natural language parsing cost
    if (tokenBalance < tokenCost) {
      setError('Insufficient tokens for natural language parsing (need 15 tokens)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/habits/ai/natural-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input: input.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse input');
      }

      setParsedLogs(data.parsedLogs);
      setTokenBalance(prev => prev - tokenCost);
      
      if (onLogsGenerated) {
        onLogsGenerated(data.parsedLogs);
      }

      // Show success message
      if (data.parsedLogs.length > 0) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>🤖 Parsed ${data.parsedLogs.length} habit(s)! Used ${tokenCost} tokens.</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }

    } catch (error) {
      console.error('Error parsing input:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse input');
    } finally {
      setLoading(false);
    }
  };

  const logParsedHabit = async (log: ParsedHabitLog) => {
    if (!user || !log.habitId) return;

    try {
      const token = await user.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/habits/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          habitId: log.habitId,
          value: log.value,
          date: log.date || new Date().toISOString().split('T')[0],
          notes: log.notes,
          context: log.suggestedContext
        })
      });

      if (response.ok) {
        // Remove the logged habit from parsed logs
        setParsedLogs(prev => prev.filter(l => l !== log));
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>✅ ${log.habitName} logged successfully!</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      }
    } catch (error) {
      console.error('Error logging habit:', error);
    }
  };

  const clearParsedLogs = () => {
    setParsedLogs([]);
    setInput('');
    setError(null);
  };

  const exampleInputs = [
    "I exercised for 45 minutes and meditated this morning",
    "Yesterday I read for 30 minutes and journaled",
    "I did my workout, took vitamins, and drank 8 glasses of water today",
    "Skipped gym but did yoga for 20 minutes at home"
  ];

  if (!user) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">Please log in to use natural language logging</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg font-semibold text-gray-900">Natural Language Logger</h3>
          </div>
          <div className="text-sm text-gray-600">
            Balance: <span className="font-medium">{tokenBalance.toLocaleString()}</span> tokens
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="nlp-input" className="block text-sm font-medium text-gray-700 mb-2">
              Describe what you did (15 tokens per parse)
            </label>
            <div className="relative">
              <textarea
                id="nlp-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., I exercised for 30 minutes and meditated this morning..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
              <button
                onClick={parseInput}
                disabled={loading || !input.trim() || tokenBalance < 15}
                className="absolute bottom-3 right-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <span>🧠</span>
                    <span>Parse</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {parsedLogs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Parsed Habits</h4>
                <button
                  onClick={clearParsedLogs}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
              
              {parsedLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">{log.habitName}</h5>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {Math.round(log.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {log.habitId ? (
                        <button
                          onClick={() => logParsedHabit(log)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Log It
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">No matching habit found</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Value:</strong> {log.value}</p>
                    {log.date && <p><strong>Date:</strong> {log.date}</p>}
                    {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
                    {log.suggestedContext && (
                      <div>
                        <strong>Suggested Context:</strong>
                        <ul className="ml-4 mt-1">
                          {log.suggestedContext.mood && <li>Mood: {log.suggestedContext.mood}/5</li>}
                          {log.suggestedContext.energy && <li>Energy: {log.suggestedContext.energy}/5</li>}
                          {log.suggestedContext.location && <li>Location: {log.suggestedContext.location}</li>}
                          {log.suggestedContext.tags && <li>Tags: {log.suggestedContext.tags.join(', ')}</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsedLogs.length === 0 && !loading && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Example inputs:</h4>
              <div className="space-y-2">
                {exampleInputs.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(example)}
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}