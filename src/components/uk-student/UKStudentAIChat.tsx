// src/components/uk-student/UKStudentAIChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Brain, TrendingUp, Target, AlertTriangle, Calendar, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
  actions?: string[];
}

interface UKStudentAIChatProps {
  className?: string;
}

export default function UKStudentAIChat({ className = '' }: UKStudentAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      content: "Hey! I'm Mesh, your UK Student Life Optimization AI. I understand Birmingham student life - from managing your budget to optimizing your daily schedule. I can help you with:\n\n• Creating tasks from natural language (\"I need to clean my cat's litter and do grocery shopping tomorrow\")\n• Adjusting your schedule based on energy levels (\"I'm feeling tired, can we move gym to evening?\")\n• Generating holistic daily plans\n• Analyzing spending patterns and budget\n• Planning meals and shopping\n• Managing academic deadlines\n• Cross-module insights (sleep, spending, habits, productivity)\n\nWhat can I help you with today?",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/uk-student-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          action: 'chat'
        }),
      });

      const data = await response.json();

      if (data.response) {
        const agentMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: typeof data.response === 'string' ? data.response : JSON.stringify(data.response),
          timestamp: new Date().toISOString(),
          actions: data.actions || []
        };

        setMessages(prev => [...prev, agentMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'agent',
        content: "I'm having trouble processing that right now. Let me analyze your data and get back to you with insights!",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const quickActions = [
    { label: "I'm feeling tired", icon: Zap },
    { label: "Check my budget", icon: TrendingUp },
    { label: "Plan my day", icon: Calendar },
    { label: "What should I focus on?", icon: Target }
  ];

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Mesh - UK Student AI</h3>
          <p className="text-sm text-gray-600">Your Birmingham student life optimizer</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message bubble */}
              <div className={`flex items-start gap-2 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300 space-y-1">
                      {message.actions.map((action, idx) => (
                        <p key={idx} className="text-xs text-gray-600">✓ {action}</p>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-600">Mesh is analyzing your UK student data...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Mesh about your tasks, budget, schedule, or get optimization suggestions..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => setInputMessage(action.label)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                disabled={isLoading}
              >
                <Icon className="w-3 h-3" />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 mt-2">
          💡 Try: "I need to clean my cat's litter and do grocery shopping tomorrow" or "I'm feeling tired, can we move gym to evening?"
        </p>
      </div>
    </div>
  );
}
