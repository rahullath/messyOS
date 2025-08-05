import React, { useState, useEffect } from 'react';

export default function IntelligentTaskManager() {
  const [tasks, setTasks] = useState([]);
  const [smartSuggestion, setSmartSuggestion] = useState('');

  const suggestOptimalTask = async () => {
    try {
      const response = await fetch('/api/ai/task-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_time: new Date().getHours(),
          energy_level: 'medium', // Could come from user input
          recent_habits: 'gym completed, good sleep',
          pending_tasks: tasks.filter(t => t.status === 'todo')
        })
      });

      const data = await response.json();
      setSmartSuggestion(data.suggestion);
    } catch (error) {
      console.error('Failed to get task suggestion:', error);
    }
  };

  const quickAddTask = async (taskText: string) => {
    try {
      const response = await fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_dump: `Task: ${taskText}`
        })
      });

      if (response.ok) {
        loadTasks(); // Refresh task list
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-4">🎯 Intelligent Task Manager</h3>
      
      {smartSuggestion && (
        <div className="bg-cyan-500/20 border border-cyan-500/30 rounded p-3 mb-4">
          <p className="text-cyan-200 text-sm">
            <strong>AI Suggestion:</strong> {smartSuggestion}
          </p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <button
          onClick={() => quickAddTask('Apply for UK visa extension')}
          className="w-full text-left bg-gray-700 p-2 rounded text-gray-300 hover:bg-gray-600"
        >
          + UK Visa Task
        </button>
        <button
          onClick={() => quickAddTask('Update coding project')}
          className="w-full text-left bg-gray-700 p-2 rounded text-gray-300 hover:bg-gray-600"
        >
          + Coding Task
        </button>
        <button
          onClick={() => quickAddTask('Order cat supplies for UK')}
          className="w-full text-left bg-gray-700 p-2 rounded text-gray-300 hover:bg-gray-600"
        >
          + Cat Care Task
        </button>
      </div>

      <button
        onClick={suggestOptimalTask}
        className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700"
      >
        🤖 What Should I Do Now?
      </button>
    </div>
  );
}