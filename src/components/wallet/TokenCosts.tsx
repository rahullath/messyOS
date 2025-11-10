// src/components/wallet/TokenCosts.tsx - Token Costs Display Component
import React from 'react';
import { tokenService } from '../../lib/tokens/service';

interface TokenCostsProps {
  showEstimates?: boolean;
  className?: string;
}

export function TokenCosts({ showEstimates = true, className = '' }: TokenCostsProps) {
  const tokenCosts = tokenService.getTokenCosts();

  const featureDescriptions = {
    ai_chat: {
      name: 'AI Chat Message',
      description: 'Interactive conversation with your AI assistant',
      icon: '💬',
      examples: ['Ask questions', 'Get advice', 'Brainstorm ideas']
    },
    ai_insight: {
      name: 'AI Insight Generation',
      description: 'Personalized insights from your data patterns',
      icon: '🔍',
      examples: ['Habit analysis', 'Goal recommendations', 'Pattern detection']
    },
    ai_analysis: {
      name: 'Complex AI Analysis',
      description: 'Deep analysis of your life optimization data',
      icon: '📊',
      examples: ['Comprehensive reports', 'Trend analysis', 'Optimization plans']
    },
    ai_recommendation: {
      name: 'AI Recommendation',
      description: 'Smart suggestions for improving your routines',
      icon: '💡',
      examples: ['Habit suggestions', 'Schedule optimization', 'Goal adjustments']
    },
    ai_summary: {
      name: 'AI Summary Generation',
      description: 'Condensed summaries of your progress and data',
      icon: '📝',
      examples: ['Daily summaries', 'Weekly reports', 'Progress overviews']
    },
    ai_action: {
      name: 'AI Action Execution',
      description: 'Automated actions performed by your AI assistant',
      icon: '⚡',
      examples: ['Task creation', 'Calendar updates', 'Data organization']
    }
  };

  const formatINR = (tokens: number) => {
    const inr = tokens / 10;
    return `₹${inr.toFixed(2)}`;
  };

  const getUsageEstimate = (cost: number) => {
    const estimates = [
      { tokens: 1000, uses: Math.floor(1000 / cost) },
      { tokens: 5000, uses: Math.floor(5000 / cost) },
      { tokens: 10000, uses: Math.floor(10000 / cost) }
    ];
    return estimates;
  };

  return (
    <div className={`token-costs ${className}`}>
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-2">Token Pricing</h3>
        <p className="text-gray-400 text-sm">
          Understand how tokens are used for different AI features. All prices are per usage.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="space-y-4">
        {Object.entries(tokenCosts).map(([feature, cost]) => {
          const info = featureDescriptions[feature as keyof typeof featureDescriptions];
          return (
            <div key={feature} className="pricing-card">
              <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{info.icon}</div>
                    <div>
                      <h4 className="text-white font-medium">{info.name}</h4>
                      <p className="text-gray-400 text-sm">{info.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 font-bold text-lg">
                      {cost.toLocaleString()} tokens
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatINR(cost)}
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-2">Examples:</div>
                  <div className="flex flex-wrap gap-2">
                    {info.examples.map((example, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Usage estimates */}
                {showEstimates && (
                  <div className="border-t border-gray-700 pt-3">
                    <div className="text-gray-400 text-xs mb-2">Usage estimates:</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {getUsageEstimate(cost).map(({ tokens, uses }) => (
                        <div key={tokens} className="text-center p-2 bg-gray-700 rounded">
                          <div className="text-white font-medium">{uses}x</div>
                          <div className="text-gray-400">with {tokens.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Token value explanation */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/20">
        <div className="flex items-start space-x-3">
          <div className="text-purple-400 text-xl">💰</div>
          <div>
            <h4 className="text-white font-medium mb-2">Token Value</h4>
            <div className="text-gray-300 text-sm space-y-1">
              <p>• 10 tokens = ₹1 (Indian Rupee)</p>
              <p>• New users get 4,800 tokens free (₹480 value)</p>
              <p>• 30-day trial period for all features</p>
              <p>• Unused tokens never expire</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost comparison */}
      <div className="mt-6">
        <h4 className="text-white font-medium mb-3">Cost Comparison</h4>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-2">Most Economical</div>
              <div className="text-green-400 font-medium">
                AI Chat: {tokenCosts.ai_chat} tokens ({formatINR(tokenCosts.ai_chat)})
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-2">Most Powerful</div>
              <div className="text-blue-400 font-medium">
                AI Analysis: {tokenCosts.ai_analysis} tokens ({formatINR(tokenCosts.ai_analysis)})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified version for quick reference
export function QuickTokenCosts() {
  const tokenCosts = tokenService.getTokenCosts();

  return (
    <div className="quick-token-costs">
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Token Costs</h4>
        <div className="space-y-2">
          {Object.entries(tokenCosts).map(([feature, cost]) => (
            <div key={feature} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 capitalize">
                {feature.replace('_', ' ')}
              </span>
              <span className="text-purple-400 font-medium">
                {cost} tokens
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CSS for token costs
const costsStyles = `
  .pricing-card {
    transition: all 0.2s ease;
  }

  .pricing-card:hover {
    transform: translateY(-1px);
  }

  .quick-token-costs {
    transition: all 0.2s ease;
  }

  .quick-token-costs:hover {
    transform: scale(1.01);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = costsStyles;
  document.head.appendChild(styleSheet);
}