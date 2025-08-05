// 4. Restore AI Agent with Better Implementation
// src/components/ai/SmartLifeAssistant.tsx

import React, { useState } from 'react';

export default function SmartLifeAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await fetch('/api/ai/life-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: 'personal_optimization'
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-4">🤖 Your Life Coach</h3>
      
      <div className="h-64 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.role === 'user' 
                ? 'bg-cyan-600 text-white ml-4' 
                : 'bg-gray-700 text-gray-200 mr-4'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-700 text-gray-200 mr-4 p-2 rounded">
            Thinking...
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about habits, tasks, health, or UK prep..."
          className="flex-1 bg-gray-700 text-white p-2 rounded"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700"
        >
          Send
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => setInput('How are my habits today?')}
          className="text-xs bg-gray-700 p-2 rounded text-gray-300"
        >
          Check Habits
        </button>
        <button
          onClick={() => setInput('What should I focus on for UK prep?')}
          className="text-xs bg-gray-700 p-2 rounded text-gray-300"
        >
          UK Prep
        </button>
        <button
          onClick={() => setInput('Analyze my health trends')}
          className="text-xs bg-gray-700 p-2 rounded text-gray-300"
        >
          Health Analysis
        </button>
        <button
          onClick={() => setInput('Help me optimize my day')}
          className="text-xs bg-gray-700 p-2 rounded text-gray-300"
        >
          Daily Optimization
        </button>
      </div>
    </div>
  );
}