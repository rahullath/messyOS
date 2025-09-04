// Progress sharing component
import React, { useState } from 'react';
// Using CSS animations instead of framer-motion for better build compatibility
import type { LifeOptimizationScore } from '../../types/cross-module';

interface ProgressSharingProps {
  userId: string;
  authToken: string;
  currentScore: LifeOptimizationScore | null;
}

export const ProgressSharing: React.FC<ProgressSharingProps> = ({
  userId,
  authToken,
  currentScore
}) => {
  const [shareType, setShareType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [makePublic, setMakePublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateShareableProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate: string;
      let endDate: string;

      if (shareType === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select both start and end dates for custom range');
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        
        if (shareType === 'weekly') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString().split('T')[0];
        } else {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = monthAgo.toISOString().split('T')[0];
        }
      }

      const response = await fetch('/api/cross-module/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: shareType,
          start_date: startDate,
          end_date: endDate,
          title: title || `My ${shareType.charAt(0).toUpperCase() + shareType.slice(1)} Progress`,
          make_public: makePublic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate shareable progress');
      }

      const data = await response.json();
      setShareUrl(data.data.share_url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      setLoading(true);
      setError(null);

      let startDate: string;
      let endDate: string;

      if (shareType === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select both start and end dates for custom range');
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        
        if (shareType === 'weekly') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString().split('T')[0];
        } else {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = monthAgo.toISOString().split('T')[0];
        }
      }

      const response = await fetch('/api/cross-module/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          modules: ['habits', 'tasks', 'health', 'content'],
          date_range: { start: startDate, end: endDate },
          include_insights: true,
          include_achievements: true,
          include_correlations: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messyos-export-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Score Summary */}
      {currentScore && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-2">Current Life Optimization Score</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{Math.round(currentScore.overall_score)}</div>
              <div className="text-sm text-gray-600">Overall</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{Math.round(currentScore.habits_score)}</div>
              <div className="text-sm text-gray-600">Habits</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{Math.round(currentScore.tasks_score)}</div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{Math.round(currentScore.health_score)}</div>
              <div className="text-sm text-gray-600">Health</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">{Math.round(currentScore.productivity_score)}</div>
              <div className="text-sm text-gray-600">Productivity</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">{Math.round(currentScore.content_score)}</div>
              <div className="text-sm text-gray-600">Content</div>
            </div>
          </div>
        </div>
      )}

      {/* Share Configuration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Generate Progress Summary</h3>
          
          {/* Time Range Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={shareType}
                onChange={(e) => setShareType(e.target.value as 'weekly' | 'monthly' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">Last 7 Days</option>
                <option value="monthly">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {shareType === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`My ${shareType.charAt(0).toUpperCase() + shareType.slice(1)} Progress`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="makePublic"
                checked={makePublic}
                onChange={(e) => setMakePublic(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="makePublic" className="text-sm text-gray-700">
                Make publicly shareable
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={generateShareableProgress}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Summary'}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => exportData('json')}
                disabled={loading}
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={() => exportData('csv')}
                disabled={loading}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Share Results</h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {shareUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in-up">
              <h4 className="font-medium text-green-800 mb-2">✅ Progress Summary Generated!</h4>
              <p className="text-green-700 text-sm mb-3">
                Your progress summary has been created and is ready to share.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => copyToClipboard(shareUrl)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {!shareUrl && !error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600">
                Configure your settings and generate a progress summary to share your achievements!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
