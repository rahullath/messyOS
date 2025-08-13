// src/components/ai/OptimizedAIChat.tsx - Enhanced AI Chat Component
// Uses optimized chat API with performance monitoring and autonomous actions

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  performance?: {
    response_time_ms: number;
    cache_hit: boolean;
    actions_executed: number;
    tokens_used?: number;
  };
}

interface OptimizedAIChatProps {
  userId?: string;
  showPerformanceMetrics?: boolean;
  enableStreaming?: boolean;
  maxMessages?: number;
  onActionExecuted?: (actionsCount: number) => void;
}

const OptimizedAIChat: React.FC<OptimizedAIChatProps> = ({
  userId,
  showPerformanceMetrics = false,
  enableStreaming = true,
  maxMessages = 50,
  onActionExecuted
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load conversation history and stats
  useEffect(() => {
    loadChatHistory();
    if (showPerformanceMetrics) {
      loadPerformanceStats();
    }
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/ai/optimized-chat?history=true');
      if (response.ok) {
        const data = await response.json();
        if (data.conversation_history) {
          const formattedMessages: ChatMessage[] = [];
          
          data.conversation_history.slice(0, 10).forEach((conv: any) => {
            formattedMessages.push({
              id: `user-${conv.id}`,
              type: 'user',
              content: conv.user_message,
              timestamp: conv.created_at
            });
            formattedMessages.push({
              id: `assistant-${conv.id}`,
              type: 'assistant',
              content: conv.ai_response,
              timestamp: conv.created_at
            });
          });
          
          setMessages(formattedMessages.reverse());
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadPerformanceStats = async () => {
    try {
      const response = await fetch('/api/ai/optimized-chat?stats=true');
      if (response.ok) {
        const data = await response.json();
        setPerformanceStats(data.performance_stats);
      }
    } catch (error) {
      console.error('Error loading performance stats:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      
      const response = await fetch('/api/ai/optimized-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          enableStreaming
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          performance: data.performance
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Notify about executed actions
        if (data.performance.actions_executed > 0 && onActionExecuted) {
          onActionExecuted(data.performance.actions_executed);
        }

        // Update performance stats if shown
        if (showPerformanceMetrics) {
          setPerformanceStats(prev => ({
            ...prev,
            last_response_time: data.performance.ai_response_time_ms,
            total_requests: (prev?.total_requests || 0) + 1,
            cache_hits: (prev?.cache_hits || 0) + (data.performance.cache_hit ? 1 : 0),
            total_actions: (prev?.total_actions || 0) + data.performance.actions_executed
          }));
        }

      } else {
        setError(data.error || 'Failed to get AI response');
        
        // Add fallback response if available
        if (data.fallback_response) {
          const fallbackMessage: ChatMessage = {
            id: `fallback-${Date.now()}`,
            type: 'assistant',
            content: data.fallback_response,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, fallbackMessage]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPerformanceColor = (responseTime: number) => {
    if (responseTime < 2000) return 'text-green-400';
    if (responseTime < 5000) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl">
      {/* Header with performance stats */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-white">🤖 Mesh AI</h2>
          <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs">
            Optimized
          </span>
        </div>
        
        {showPerformanceMetrics && performanceStats && (
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>Cache Hit: {Math.round((performanceStats.cache_hits / (performanceStats.total_requests || 1)) * 100)}%</span>
            <span>Actions: {performanceStats.total_actions}</span>
            <span className={getPerformanceColor(performanceStats.last_response_time || 0)}>
              {performanceStats.last_response_time || 0}ms
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-white font-semibold mb-2">Hi! I'm Mesh, your AI life optimizer</h3>
            <p className="text-gray-400 mb-4">I can help you with:</p>
            <div className="text-gray-300 text-sm space-y-1">
              <p>✅ Creating tasks automatically</p>
              <p>📊 Logging habits from conversation</p>
              <p>📈 Tracking metrics you mention</p>
              <p>🎯 Analyzing your life patterns</p>
              <p>🔄 Autonomous actions with transparency</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  
                  {message.performance && showPerformanceMetrics && (
                    <div className="flex items-center space-x-2">
                      {message.performance.cache_hit && (
                        <span className="text-green-400">💾</span>
                      )}
                      {message.performance.actions_executed > 0 && (
                        <span className="text-blue-400">⚡{message.performance.actions_executed}</span>
                      )}
                      <span className={getPerformanceColor(message.performance.response_time_ms)}>
                        {message.performance.response_time_ms}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
                <span>Mesh is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/50 text-red-200 border border-red-800 rounded-lg px-4 py-2 max-w-[80%] text-center">
              <div className="font-medium">⚠️ {error}</div>
              <button 
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-100 text-sm underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Mesh anything about your life optimization..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
        
        {enableStreaming && (
          <div className="mt-2 text-xs text-gray-400 text-center">
            💫 Streaming enabled for faster responses
          </div>
        )}
      </div>
    </div>
  );
};

// Performance metrics component
export const ChatPerformanceMetrics: React.FC<{ stats: any }> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3">⚡ Performance Metrics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-cyan-400 font-semibold">{stats.total_conversations || 0}</div>
          <div className="text-gray-400">Conversations</div>
        </div>
        
        <div className="text-center">
          <div className="text-green-400 font-semibold">{stats.executed_actions || 0}</div>
          <div className="text-gray-400">Actions</div>
        </div>
        
        <div className="text-center">
          <div className="text-yellow-400 font-semibold">
            {Math.round((stats.average_confidence || 0) * 100)}%
          </div>
          <div className="text-gray-400">Confidence</div>
        </div>
        
        <div className="text-center">
          <div className="text-purple-400 font-semibold">{stats.recent_activity || 0}</div>
          <div className="text-gray-400">Today</div>
        </div>
      </div>
      
      {stats.action_types && stats.action_types.length > 0 && (
        <div className="mt-4">
          <div className="text-gray-300 text-xs mb-2">Action Types:</div>
          <div className="flex flex-wrap gap-1">
            {stats.action_types.map((type: string) => (
              <span key={type} className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs">
                {type.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedAIChat;