// src/components/ai/AIAgentStatus.tsx
import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface AIAgentStatusProps {
  className?: string;
}

interface StatusData {
  isActive: boolean;
  lastAnalysis: string;
  insightsCount: number;
  actionsCount: number;
  confidence: number;
}

export default function AIAgentStatus({ className = '' }: AIAgentStatusProps) {
  const [status, setStatus] = useState<StatusData>({
    isActive: true,
    lastAnalysis: 'Just now',
    insightsCount: 0,
    actionsCount: 0,
    confidence: 85
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and then show status
    const timer = setTimeout(() => {
      setStatus({
        isActive: true,
        lastAnalysis: new Date().toLocaleTimeString(),
        insightsCount: Math.floor(Math.random() * 10) + 5,
        actionsCount: Math.floor(Math.random() * 5) + 2,
        confidence: Math.floor(Math.random() * 20) + 80
      });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-6 border border-blue-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Mesh AI Agent</h3>
          <div className="flex items-center gap-2">
            {status.isActive ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 font-medium">Inactive</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-600">Insights</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{status.insightsCount}</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-600">Actions</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{status.actionsCount}</div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Last Analysis</span>
          <div className="flex items-center gap-1 text-gray-900">
            <Clock className="w-3 h-3" />
            <span className="font-medium">{status.lastAnalysis}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                style={{ width: `${status.confidence}%` }}
              ></div>
            </div>
            <span className="font-medium text-gray-900">{status.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <a 
          href="/ai-agent"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Bot className="w-4 h-4" />
          Chat with Mesh
        </a>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-500">
          Analyzing your patterns • Learning your preferences
        </span>
      </div>
    </div>
  );
}