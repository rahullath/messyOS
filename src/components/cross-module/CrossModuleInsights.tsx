// Cross-module insights component
import React from 'react';
import { motion } from 'framer-motion';
import type { CrossModuleInsight } from '../../types/cross-module';

interface CrossModuleInsightsProps {
  insights: CrossModuleInsight[];
}

export const CrossModuleInsights: React.FC<CrossModuleInsightsProps> = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">🔍</div>
        <p>No cross-module insights available yet.</p>
        <p className="text-sm mt-2">Keep tracking your habits and tasks to discover patterns!</p>
      </div>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'correlation': return '🔗';
      case 'pattern': return '📊';
      case 'recommendation': return '💡';
      case 'achievement': return '🏆';
      default: return '📈';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'correlation': return 'from-blue-500 to-cyan-500';
      case 'pattern': return 'from-green-500 to-emerald-500';
      case 'recommendation': return 'from-yellow-500 to-orange-500';
      case 'achievement': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getInsightColor(insight.type)} flex items-center justify-center text-white text-xl flex-shrink-0`}>
              {getInsightIcon(insight.type)}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                
                {/* Confidence Badge */}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                  {Math.round(insight.confidence * 100)}% confidence
                </span>

                {/* Actionable Badge */}
                {insight.actionable && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                    Actionable
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-3">{insight.description}</p>

              {/* Modules Involved */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-500">Modules:</span>
                {insight.modules.map((module, moduleIndex) => (
                  <span
                    key={moduleIndex}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium"
                  >
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </span>
                ))}
              </div>

              {/* Data Visualization */}
              {insight.data && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <div className="text-sm text-gray-600 mb-2">Supporting Data:</div>
                  {insight.type === 'correlation' && insight.data.correlation && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Correlation Strength</span>
                          <span className="font-medium">
                            {insight.data.correlation > 0 ? '+' : ''}{Math.round(insight.data.correlation * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              insight.data.correlation > 0 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.abs(insight.data.correlation) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      {insight.data.sample_size && (
                        <div className="text-sm text-gray-500">
                          {insight.data.sample_size} data points
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-400 mt-3">
                Generated {new Date(insight.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};