// 2. Enhanced Health Data Entry (Replace Manual OCR)
// src/components/health/QuickHealthLogger.tsx

import React, { useState } from 'react';

export default function QuickHealthLogger() {
  const [metrics, setMetrics] = useState({
    sleep: '',
    steps: '',
    weight: '',
    heartRate: '',
    stress: '',
    protein: '',
    water: ''
  });

  const quickLog = async () => {
    try {
      const entries = Object.entries(metrics)
        .filter(([_, value]) => value)
        .map(([type, value]) => ({
          type,
          value: parseFloat(value),
          category: 'Health',
          recorded_at: new Date().toISOString()
        }));

      // Send to your smart data dump API
      const response = await fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_dump: `Health metrics: ${entries.map(e => `${e.type}: ${e.value}`).join(', ')}`
        })
      });

      if (response.ok) {
        setMetrics({
          sleep: '', steps: '', weight: '', heartRate: '',
          stress: '', protein: '', water: ''
        });
        alert('Health data logged successfully!');
      }
    } catch (error) {
      console.error('Failed to log health data:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-4">⚡ Quick Health Logger</h3>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <input
          type="number"
          placeholder="Sleep (hours)"
          value={metrics.sleep}
          onChange={(e) => setMetrics(prev => ({ ...prev, sleep: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Steps"
          value={metrics.steps}
          onChange={(e) => setMetrics(prev => ({ ...prev, steps: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Weight (kg)"
          value={metrics.weight}
          onChange={(e) => setMetrics(prev => ({ ...prev, weight: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Heart Rate"
          value={metrics.heartRate}
          onChange={(e) => setMetrics(prev => ({ ...prev, heartRate: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Stress (1-10)"
          value={metrics.stress}
          onChange={(e) => setMetrics(prev => ({ ...prev, stress: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Protein (g)"
          value={metrics.protein}
          onChange={(e) => setMetrics(prev => ({ ...prev, protein: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
        <input
          type="number"
          placeholder="Water (L)"
          value={metrics.water}
          onChange={(e) => setMetrics(prev => ({ ...prev, water: e.target.value }))}
          className="bg-gray-700 text-white p-2 rounded"
        />
      </div>

      <button
        onClick={quickLog}
        className="w-full bg-cyan-600 text-white py-2 rounded font-medium hover:bg-cyan-700"
      >
        Log All Health Metrics
      </button>
    </div>
  );
}