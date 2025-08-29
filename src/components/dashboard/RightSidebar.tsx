// src/components/dashboard/RightSidebar.tsx - Right Sidebar with AI Assistant
import React, { useState, useEffect } from 'react';

interface AgendaItem {
  id: string;
  type: 'task' | 'reminder' | 'meal' | 'workout';
  title: string;
  time: string;
  completed?: boolean;
}

export default function RightSidebar() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    // Mock agenda data
    setAgenda([
      { id: '1', type: 'task', title: 'Team standup meeting', time: '2:00 PM' },
      { id: '2', type: 'meal', title: 'Protein snack reminder', time: '3:30 PM' },
      { id: '3', type: 'workout', title: 'Evening cardio session', time: '6:00 PM' },
      { id: '4', type: 'reminder', title: 'Plan tomorrow\'s meals', time: '8:00 PM' }
    ]);
  }, []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'meal': return '🍎';
      case 'workout': return '🏃';
      case 'reminder': return '⏰';
      default: return '📝';
    }
  };

  const sendAIMessage = () => {
    if (!aiMessage.trim()) return;
    // Handle AI message sending here
    setAiMessage('');
  };

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-80 bg-messy-bg border-l border-messy-border z-40">
      <div className="h-full flex flex-col">
        
        {/* AI Assistant Section */}
        <div className="border-b border-messy-border">
          {!isAIChatOpen ? (
            /* Minimized AI Chat */
            <div className="p-4">
              <button
                onClick={() => setIsAIChatOpen(true)}
                className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-messy-primary to-messy-secondary rounded-lg text-black font-medium hover:shadow-lg transition-all"
              >
                <span className="text-lg">🤖</span>
                <span>Ask AI Assistant</span>
                <span className="ml-auto text-sm opacity-75">⌘K</span>
              </button>
            </div>
          ) : (
            /* Expanded AI Chat */
            <div className="h-80 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-messy-border">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-messy-primary font-medium">AI Assistant</span>
                  <div className="messy-status-active"></div>
                </div>
                <button
                  onClick={() => setIsAIChatOpen(false)}
                  className="text-messy-muted hover:text-messy-primary"
                >
                  ✕
                </button>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 p-4 space-y-3 messy-scrollbar overflow-y-auto">
                <div className="bg-messy-card-bg p-3 rounded-lg">
                  <div className="text-messy-primary text-sm">
                    Hey! I noticed you've been consistent with your morning workouts. 
                    Want me to suggest some nutrition optimizations?
                  </div>
                </div>
                <div className="bg-messy-primary bg-opacity-10 p-3 rounded-lg ml-6">
                  <div className="text-messy-secondary text-sm">
                    Yes, show me some ideas
                  </div>
                </div>
                <div className="bg-messy-card-bg p-3 rounded-lg">
                  <div className="text-messy-primary text-sm">
                    Based on your workout timing, try having a protein-rich snack 
                    30min before. Your energy levels show a 15% improvement pattern.
                  </div>
                </div>
              </div>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-messy-border">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 messy-input text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                  />
                  <button
                    onClick={sendAIMessage}
                    className="messy-btn-primary px-3 py-1 text-sm"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's Agenda */}
        <div className="flex-1 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-lg">📅</span>
            <h3 className="text-messy-primary font-medium">Today's Agenda</h3>
          </div>
          
          <div className="space-y-3">
            {agenda.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-messy-card-bg rounded-lg hover:bg-messy-card-hover transition-colors group">
                <span className="text-sm">{getItemIcon(item.type)}</span>
                <div className="flex-1">
                  <div className="text-messy-secondary text-sm">{item.title}</div>
                  <div className="text-messy-muted text-xs">{item.time}</div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 w-4 h-4 border border-messy-border rounded hover:border-messy-primary transition-all">
                </button>
              </div>
            ))}
          </div>

          {/* Quick Suggestions */}
          <div className="mt-6">
            <h4 className="text-messy-secondary font-medium mb-3">Suggestions</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-2 bg-messy-success bg-opacity-10 rounded text-messy-success text-sm hover:bg-opacity-20 transition-colors">
                💧 Drink water (last: 2h ago)
              </button>
              <button className="w-full text-left p-2 bg-messy-warning bg-opacity-10 rounded text-messy-warning text-sm hover:bg-opacity-20 transition-colors">
                🥗 Log your lunch
              </button>
              <button className="w-full text-left p-2 bg-messy-primary bg-opacity-10 rounded text-messy-accent-primary text-sm hover:bg-opacity-20 transition-colors">
                📱 Take a focus break
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Add keyboard shortcut for AI
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      // Trigger AI assistant open
    }
  });
}