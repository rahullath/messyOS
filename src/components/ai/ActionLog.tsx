// src/components/ai/ActionLog.tsx - AI Action Logging UI Component
// Shows users what AI did automatically with transparency and feedback options

import React, { useState, useEffect } from 'react';

interface AIAction {
  id: string;
  action_type: string;
  description: string;
  data: any;
  confidence: number;
  reasoning: string;
  executed: boolean;
  created_at: string;
  executed_at?: string;
  result?: any;
  user_feedback?: 'approved' | 'rejected' | 'modified';
}

interface ActionLogProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
  onActionFeedback?: (actionId: string, feedback: string) => void;
}

const ActionTypeIcons = {
  create_task: '📝',
  log_habit: '✅',
  record_metric: '📊',
  create_habit: '🎯',
  update_task: '✏️',
  create_reminder: '🔔'
};

const ConfidenceColors = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-red-400'
};

const ActionLog: React.FC<ActionLogProps> = ({
  userId,
  limit = 20,
  showFilters = true,
  autoRefresh = false,
  onActionFeedback
}) => {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [showExecutedOnly, setShowExecutedOnly] = useState(false);

  // Fetch AI actions from API
  const fetchActions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/actions?limit=${limit}${filter !== 'all' ? `&type=${filter}` : ''}${showExecutedOnly ? '&executed=true' : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI actions');
      }
      
      const data = await response.json();
      setActions(data.actions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions');
      console.error('Error fetching AI actions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle user feedback on actions
  const handleActionFeedback = async (actionId: string, feedback: 'approved' | 'rejected' | 'modified') => {
    try {
      const response = await fetch(`/api/ai/actions/${actionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback })
      });

      if (response.ok) {
        // Update local state
        setActions(prev => prev.map(action => 
          action.id === actionId 
            ? { ...action, user_feedback: feedback }
            : action
        ));

        // Call callback if provided
        if (onActionFeedback) {
          onActionFeedback(actionId, feedback);
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Toggle expanded view for action details
  const toggleExpanded = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  // Format confidence as readable text
  const getConfidenceLevel = (confidence: number): { level: string; color: string } => {
    if (confidence >= 0.8) return { level: 'High', color: ConfidenceColors.high };
    if (confidence >= 0.6) return { level: 'Medium', color: ConfidenceColors.medium };
    return { level: 'Low', color: ConfidenceColors.low };
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Get unique action types for filter
  const actionTypes = [...new Set(actions.map(a => a.action_type))];

  useEffect(() => {
    fetchActions();
  }, [filter, showExecutedOnly, limit]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchActions, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && actions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <span className="ml-3 text-gray-400">Loading AI actions...</span>
      </div>
    );
  }

  if (error && actions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-red-400 mb-2">⚠️ {error}</div>
        <button 
          onClick={fetchActions}
          className="text-cyan-400 hover:text-cyan-300 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-white">🤖 AI Actions</h2>
          <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs">
            {actions.filter(a => a.executed).length} executed
          </span>
        </div>
        
        <button 
          onClick={fetchActions}
          disabled={loading}
          className="text-gray-400 hover:text-white text-sm flex items-center space-x-1"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Types</option>
            {actionTypes.map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
          
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showExecutedOnly}
              onChange={(e) => setShowExecutedOnly(e.target.checked)}
              className="rounded"
            />
            <span>Executed only</span>
          </label>
        </div>
      )}

      {/* Action List */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🤖</div>
            <p>No AI actions yet</p>
            <p className="text-sm">Start chatting with AI to see autonomous actions here!</p>
          </div>
        ) : (
          actions.map((action) => {
            const confidence = getConfidenceLevel(action.confidence);
            const isExpanded = expandedActions.has(action.id);
            
            return (
              <div
                key={action.id}
                className={`border rounded-lg p-4 transition-all ${
                  action.executed
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-gray-600 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-2xl">
                      {ActionTypeIcons[action.action_type as keyof typeof ActionTypeIcons] || '🔧'}
                    </span>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-white font-medium">{action.description}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          action.executed 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}>
                          {action.executed ? 'Executed' : 'Pending'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Confidence: <span className={confidence.color}>{confidence.level}</span></span>
                        <span>{formatDate(action.created_at)}</span>
                        {action.executed && action.executed_at && (
                          <span>Executed: {formatDate(action.executed_at)}</span>
                        )}
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          <div className="bg-gray-800/50 p-3 rounded text-sm">
                            <p className="text-gray-300 mb-2"><strong>Reasoning:</strong></p>
                            <p className="text-gray-400">{action.reasoning}</p>
                          </div>
                          
                          {action.data && (
                            <div className="bg-gray-800/50 p-3 rounded text-sm">
                              <p className="text-gray-300 mb-2"><strong>Action Data:</strong></p>
                              <pre className="text-gray-400 text-xs overflow-x-auto">
                                {JSON.stringify(action.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {action.result && (
                            <div className="bg-gray-800/50 p-3 rounded text-sm">
                              <p className="text-gray-300 mb-2"><strong>Result:</strong></p>
                              <pre className="text-gray-400 text-xs overflow-x-auto">
                                {JSON.stringify(action.result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpanded(action.id)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
                
                {/* User Feedback */}
                {action.executed && !action.user_feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-600 flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Was this action helpful?</span>
                    <button
                      onClick={() => handleActionFeedback(action.id, 'approved')}
                      className="text-green-400 hover:text-green-300 text-sm px-2 py-1 rounded"
                    >
                      👍 Yes
                    </button>
                    <button
                      onClick={() => handleActionFeedback(action.id, 'rejected')}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded"
                    >
                      👎 No
                    </button>
                    <button
                      onClick={() => handleActionFeedback(action.id, 'modified')}
                      className="text-yellow-400 hover:text-yellow-300 text-sm px-2 py-1 rounded"
                    >
                      ✏️ Partially
                    </button>
                  </div>
                )}
                
                {action.user_feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-600 flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Your feedback:</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      action.user_feedback === 'approved' ? 'text-green-400 bg-green-500/20' :
                      action.user_feedback === 'rejected' ? 'text-red-400 bg-red-500/20' :
                      'text-yellow-400 bg-yellow-500/20'
                    }`}>
                      {action.user_feedback === 'approved' ? '👍 Approved' :
                       action.user_feedback === 'rejected' ? '👎 Rejected' :
                       '✏️ Partially helpful'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Load More */}
      {actions.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => fetchActions()}
            className="text-cyan-400 hover:text-cyan-300 text-sm underline"
          >
            Load more actions
          </button>
        </div>
      )}
    </div>
  );
};

// Compact version for sidebars
export const CompactActionLog: React.FC<{ userId?: string; limit?: number }> = ({ 
  userId, 
  limit = 5 
}) => {
  const [recentActions, setRecentActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActions = async () => {
      try {
        const response = await fetch(`/api/ai/actions?limit=${limit}&executed=true`);
        if (response.ok) {
          const data = await response.json();
          setRecentActions(data.actions || []);
        }
      } catch (error) {
        console.error('Error fetching recent actions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActions();
  }, [limit]);

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading recent actions...</div>;
  }

  if (recentActions.length === 0) {
    return <div className="text-gray-500 text-sm">No recent AI actions</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-white font-medium text-sm mb-3">🤖 Recent AI Actions</h3>
      {recentActions.map(action => (
        <div key={action.id} className="bg-gray-800/30 rounded p-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {ActionTypeIcons[action.action_type as keyof typeof ActionTypeIcons] || '🔧'}
            </span>
            <span className="text-white text-sm flex-1 truncate">
              {action.description}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(action.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'now';
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInHours < 48) return '1d';
  return date.toLocaleDateString();
}

export default ActionLog;