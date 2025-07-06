// src/components/ai/AgenticInsights.tsx
import React, { useState, useEffect } from 'react';
import type { AgentInsight, AgentAction, RiskFactor, Optimization } from '../../lib/intelligence/agentic-life-optimizer';

interface AgenticInsightsProps {
  userId?: string;
  type?: 'full' | 'daily';
}

interface OptimizationResult {
  insights: AgentInsight[];
  actions: AgentAction[];
  riskFactors: RiskFactor[];
  optimizations: Optimization[];
  currentFocus: string;
  todaysFocus?: string;
  urgentActions?: AgentAction[];
  quickInsights?: AgentInsight[];
}

export default function AgenticInsights({ userId, type = 'daily' }: AgenticInsightsProps) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgenticInsights();
  }, [type]);

  const loadAgenticInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/life-optimization?type=${type}`);
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to load AI insights');
      }
    } catch (err) {
      setError('Network error loading insights');
      console.error('Agentic insights error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/life-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' })
      });
      
      const data = await response.json();
      if (data.success) {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to run full analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full"></div>
          <h3 className="text-lg font-semibold text-text-primary">
            🤖 AI Agent {type === 'full' ? 'Analyzing Your Life...' : 'Daily Check-in...'}
          </h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-surface-hover rounded animate-pulse"></div>
          <div className="h-4 bg-surface-hover rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-surface-hover rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-lg font-semibold text-text-primary">AI Analysis Error</h3>
        </div>
        <p className="text-text-secondary mb-4">{error}</p>
        <button 
          onClick={loadAgenticInsights}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!result) return null;

  const displayInsights = result.quickInsights || result.insights || [];
  const displayActions = result.urgentActions || result.actions || [];
  const focus = result.todaysFocus || result.currentFocus;

  return (
    <div className="space-y-6">
      {/* Header with Analysis Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              AI Life Agent {type === 'full' ? 'Deep Analysis' : 'Daily Check-in'}
            </h2>
            <p className="text-text-muted text-sm">
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>
        
        {type === 'daily' && (
          <button 
            onClick={runFullAnalysis}
            className="px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-purple text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            🔍 Deep Analysis
          </button>
        )}
      </div>

      {/* Current Focus */}
      {focus && (
        <div className="card p-6 bg-gradient-to-r from-accent-primary/10 to-accent-purple/10 border border-accent-primary/20">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-text-primary">
              {type === 'daily' ? "Today's Focus" : "Current Focus"}
            </h3>
          </div>
          <p className="text-accent-primary font-medium">{focus}</p>
        </div>
      )}

      {/* Urgent Actions */}
      {displayActions.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">⚡</span>
            <h3 className="text-lg font-semibold text-text-primary">Recommended Actions</h3>
          </div>
          
          <div className="space-y-3">
            {displayActions.map((action, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  action.priority === 'high' 
                    ? 'bg-accent-error/10 border-accent-error/20' 
                    : action.priority === 'medium'
                    ? 'bg-accent-warning/10 border-accent-warning/20'
                    : 'bg-accent-success/10 border-accent-success/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-text-primary">{action.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      action.priority === 'high' ? 'bg-accent-error/20 text-accent-error' :
                      action.priority === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                      'bg-accent-success/20 text-accent-success'
                    }`}>
                      {action.priority}
                    </span>
                    <span className="text-xs text-text-muted">{action.timing}</span>
                  </div>
                </div>
                <p className="text-text-secondary text-sm">{action.description}</p>
                
                {action.metadata && Object.keys(action.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-text-muted">
                    {JSON.stringify(action.metadata, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {displayInsights.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-semibold text-text-primary">AI Insights</h3>
          </div>
          
          <div className="space-y-4">
            {displayInsights.map((insight, index) => (
              <div key={index} className="p-4 bg-surface-hover rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {insight.type === 'habit' ? '🔄' :
                       insight.type === 'health' ? '❤️' :
                       insight.type === 'finance' ? '💰' :
                       insight.type === 'correlation' ? '🔗' :
                       insight.type === 'prediction' ? '🔮' : '📊'}
                    </span>
                    <h4 className="font-medium text-text-primary">{insight.title}</h4>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.confidence >= 0.8 ? 'bg-accent-success' :
                      insight.confidence >= 0.6 ? 'bg-accent-warning' : 'bg-accent-error'
                    }`}></div>
                    <span className="text-xs text-text-muted">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
                
                <p className="text-text-secondary text-sm mb-2">{insight.description}</p>
                
                <div className="flex items-center space-x-4 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    insight.impact === 'high' ? 'bg-accent-error/20 text-accent-error' :
                    insight.impact === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                    'bg-accent-success/20 text-accent-success'
                  }`}>
                    {insight.impact} impact
                  </span>
                  
                  <span className={`px-2 py-1 rounded ${
                    insight.urgency === 'high' ? 'bg-accent-error/20 text-accent-error' :
                    insight.urgency === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                    'bg-accent-success/20 text-accent-success'
                  }`}>
                    {insight.urgency} urgency
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors (Full Analysis Only) */}
      {result.riskFactors && result.riskFactors.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-text-primary">Risk Factors</h3>
          </div>
          
          <div className="space-y-3">
            {result.riskFactors.map((risk, index) => (
              <div key={index} className="p-4 bg-accent-error/10 border border-accent-error/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-text-primary">{risk.risk}</h4>
                  <span className="text-sm text-accent-error">
                    {Math.round(risk.probability * 100)}% probability
                  </span>
                </div>
                
                <div className="mb-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    risk.impact === 'high' ? 'bg-accent-error/20 text-accent-error' :
                    risk.impact === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                    'bg-accent-success/20 text-accent-success'
                  }`}>
                    {risk.impact} impact
                  </span>
                </div>
                
                {risk.prevention.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Prevention:</p>
                    <ul className="text-sm text-text-secondary">
                      {risk.prevention.map((prevention, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span>•</span>
                          <span>{prevention}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimizations (Full Analysis Only) */}
      {result.optimizations && result.optimizations.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">🚀</span>
            <h3 className="text-lg font-semibold text-text-primary">Optimization Opportunities</h3>
          </div>
          
          <div className="space-y-3">
            {result.optimizations.map((opt, index) => (
              <div key={index} className="p-4 bg-accent-success/10 border border-accent-success/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-text-primary">{opt.domain}</h4>
                  <span className={`px-2 py-1 text-xs rounded ${
                    opt.effort === 'low' ? 'bg-accent-success/20 text-accent-success' :
                    opt.effort === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                    'bg-accent-error/20 text-accent-error'
                  }`}>
                    {opt.effort} effort
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-muted">Current: </span>
                    <span className="text-text-secondary">{opt.current}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Optimized: </span>
                    <span className="text-accent-success">{opt.optimized}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Expected gain: </span>
                    <span className="text-text-primary font-medium">{opt.expectedGain}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Timeframe: </span>
                    <span className="text-text-secondary">{opt.timeframe}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {displayInsights.length === 0 && displayActions.length === 0 && (
        <div className="card p-6 text-center">
          <span className="text-4xl mb-4 block">🤖</span>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            AI Agent Ready
          </h3>
          <p className="text-text-secondary mb-4">
            Start tracking habits and health data for personalized insights
          </p>
          <button 
            onClick={runFullAnalysis}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            Run Analysis
          </button>
        </div>
      )}
    </div>
  );
}