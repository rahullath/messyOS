// src/components/dashboard/cards/HealthPulseCard.tsx - Health Pulse Summary
import React, { useState, useEffect } from 'react';

interface HealthMetrics {
  energy_level: number; // 1-10 scale
  sleep_quality: number; // 1-10 scale
  sleep_hours: number;
  stress_level: number; // 1-10 scale (10 = very stressed)
  last_updated: string;
}

export default function HealthPulseCard() {
  const [healthData, setHealthData] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickMetrics, setQuickMetrics] = useState({
    energy_level: '',
    stress_level: ''
  });

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      // Mock data - replace with actual API call
      setTimeout(() => {
        setHealthData({
          energy_level: 7,
          sleep_quality: 8,
          sleep_hours: 7.5,
          stress_level: 3,
          last_updated: new Date().toISOString()
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      setIsLoading(false);
    }
  };

  const quickLogHealth = async () => {
    try {
      const response = await fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_dump: `Quick health update: Energy ${quickMetrics.energy_level}/10, Stress ${quickMetrics.stress_level}/10`
        })
      });

      if (response.ok) {
        setQuickMetrics({ energy_level: '', stress_level: '' });
        setShowQuickLog(false);
        fetchHealthData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to log health metrics:', error);
    }
  };

  const getEnergyColor = (level: number) => {
    if (level >= 7) return 'text-messy-success';
    if (level >= 4) return 'text-messy-warning';
    return 'text-messy-error';
  };

  const getStressColor = (level: number) => {
    if (level <= 3) return 'text-messy-success';
    if (level <= 6) return 'text-messy-warning';
    return 'text-messy-error';
  };

  const getSleepColor = (hours: number) => {
    if (hours >= 7 && hours <= 9) return 'text-messy-success';
    if (hours >= 6 && hours <= 10) return 'text-messy-warning';
    return 'text-messy-error';
  };

  if (isLoading) {
    return (
      <div className="messy-card h-32">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-messy-border rounded w-3/4"></div>
            <div className="h-3 bg-messy-border rounded w-1/2"></div>
            <div className="h-3 bg-messy-border rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-32 relative overflow-hidden">
      {/* Background gradient based on overall health */}
      <div className="absolute inset-0 opacity-5">
        <div className={`w-full h-full ${
          healthData && healthData.energy_level >= 7 && healthData.stress_level <= 3 
            ? 'bg-gradient-to-br from-messy-success to-transparent'
            : healthData && healthData.energy_level <= 4 || (healthData && healthData.stress_level >= 7)
            ? 'bg-gradient-to-br from-messy-error to-transparent'
            : 'bg-gradient-to-br from-messy-warning to-transparent'
        }`}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">💓</span>
            <h3 className="text-messy-primary font-medium">Health Pulse</h3>
          </div>
          <button
            onClick={() => setShowQuickLog(!showQuickLog)}
            className="text-messy-secondary hover:text-messy-primary transition-colors text-sm"
          >
            + Log
          </button>
        </div>

        {/* Quick Log Interface */}
        {showQuickLog && (
          <div className="absolute top-0 left-0 right-0 bottom-0 messy-card-glass p-4 z-20">
            <div className="space-y-3">
              <h4 className="text-messy-primary font-medium">Quick Health Check</h4>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={quickMetrics.energy_level}
                  onChange={(e) => setQuickMetrics(prev => ({...prev, energy_level: e.target.value}))}
                  className="messy-input text-sm py-1"
                >
                  <option value="">Energy (1-10)</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select
                  value={quickMetrics.stress_level}
                  onChange={(e) => setQuickMetrics(prev => ({...prev, stress_level: e.target.value}))}
                  className="messy-input text-sm py-1"
                >
                  <option value="">Stress (1-10)</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={quickLogHealth}
                  disabled={!quickMetrics.energy_level || !quickMetrics.stress_level}
                  className="flex-1 messy-btn-primary text-xs py-1 disabled:opacity-50"
                >
                  Log
                </button>
                <button
                  onClick={() => setShowQuickLog(false)}
                  className="messy-btn-secondary text-xs py-1 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Health Metrics */}
        {healthData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-messy-secondary text-sm">Energy</span>
              <span className={`font-bold ${getEnergyColor(healthData.energy_level)}`}>
                {healthData.energy_level}/10
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-messy-secondary text-sm">Sleep</span>
              <div className="text-right">
                <span className={`font-bold ${getSleepColor(healthData.sleep_hours)}`}>
                  {healthData.sleep_hours}h
                </span>
                <span className="text-messy-muted text-xs ml-1">
                  (Q{healthData.sleep_quality}/10)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-messy-secondary text-sm">Stress</span>
              <span className={`font-bold ${getStressColor(healthData.stress_level)}`}>
                {healthData.stress_level}/10
              </span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {healthData && (
          <div className="absolute bottom-1 right-3 text-messy-muted text-xs">
            {new Date(healthData.last_updated).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  );
}