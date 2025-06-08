// src/components/health/HealthDashboard.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  metadata: any;
  recorded_at: string;
}

interface HealthStats {
  avgSleep: number;
  sleepQuality: string;
  avgHeartRate: number;
  heartRateVariability: number;
  avgStress: number;
  stressStatus: string;
  healthScore: number;
  last7Days: any[];
  last30Days: any[];
  medicationAdherence: {
    bupropion: number;
    melatonin: number;
  };
}

export default function HealthDashboard({ userId }: { userId: string }) {
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadHealthData();
  }, [userId, timeRange]);

  const loadHealthData = async () => {
    try {
      const response = await fetch(`/api/health/dashboard?userId=${userId}&range=${timeRange}`);
      const data = await response.json();
      setHealthStats(data);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logMedication = async (medication: string, taken: boolean) => {
    try {
      await fetch('/api/health/medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, medication, taken })
      });
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-accent-success text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `💊 ${medication} marked as ${taken ? 'taken' : 'missed'}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      loadHealthData(); // Refresh data
    } catch (error) {
      console.error('Failed to log medication:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-surface-hover rounded mb-4"></div>
            <div className="h-32 bg-surface-hover rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!healthStats) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🏥</span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Health Data</h3>
        <p className="text-text-muted mb-4">Import your Huawei Band data to start tracking your health metrics.</p>
        <button 
          onClick={() => window.location.href = '/import'}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
        >
          Import Health Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Health Score & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Overall Health Score */}
        <div className="card p-6 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Health Score</h3>
              <p className="text-text-muted text-sm">Based on sleep, heart rate, and stress</p>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${
                healthStats.healthScore >= 80 ? 'text-accent-success' :
                healthStats.healthScore >= 60 ? 'text-accent-warning' : 'text-accent-error'
              }`}>
                {healthStats.healthScore}
              </div>
              <div className="text-text-muted text-sm">/100</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Sleep Quality</span>
              <span className="text-text-primary">{healthStats.sleepQuality}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Heart Rate</span>
              <span className="text-text-primary">{healthStats.avgHeartRate} bpm avg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Stress Level</span>
              <span className="text-text-primary">{healthStats.stressStatus}</span>
            </div>
          </div>
        </div>

        {/* Sleep */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Avg Sleep</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {healthStats.avgSleep}h
              </p>
              <p className={`text-sm mt-1 ${
                healthStats.avgSleep >= 7 ? 'text-accent-success' : 
                healthStats.avgSleep >= 6 ? 'text-accent-warning' : 'text-accent-error'
              }`}>
                {healthStats.sleepQuality}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">😴</span>
            </div>
          </div>
        </div>

        {/* Heart Rate */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Heart Rate</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {healthStats.avgHeartRate}
              </p>
              <p className="text-sm text-text-muted mt-1">
                ±{healthStats.heartRateVariability} bpm
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-error/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">❤️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Tracking */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Today's Medication</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-hover rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-text-primary">Bupropion (Morning)</h4>
                <p className="text-sm text-text-muted">Antidepressant</p>
              </div>
              <span className="text-2xl">🌅</span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => logMedication('bupropion_morning', true)}
                className="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors"
              >
                ✓ Taken
              </button>
              <button 
                onClick={() => logMedication('bupropion_morning', false)}
                className="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors"
              >
                ✗ Missed
              </button>
            </div>
          </div>

          <div className="p-4 bg-surface-hover rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-text-primary">Bupropion (Afternoon)</h4>
                <p className="text-sm text-text-muted">Antidepressant</p>
              </div>
              <span className="text-2xl">☀️</span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => logMedication('bupropion_afternoon', true)}
                className="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors"
              >
                ✓ Taken
              </button>
              <button 
                onClick={() => logMedication('bupropion_afternoon', false)}
                className="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors"
              >
                ✗ Missed
              </button>
            </div>
          </div>

          <div className="p-4 bg-surface-hover rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-text-primary">Melatonin (Evening)</h4>
                <p className="text-sm text-text-muted">Sleep aid</p>
              </div>
              <span className="text-2xl">🌙</span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => logMedication('melatonin_evening', true)}
                className="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors"
              >
                ✓ Taken
              </button>
              <button 
                onClick={() => logMedication('melatonin_evening', false)}
                className="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors"
              >
                ✗ Missed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sleep Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Sleep Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={healthStats.last30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis 
                dataKey="date" 
                stroke="#737373"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#737373" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #262626',
                  borderRadius: '8px'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value: number) => [`${(value / 60).toFixed(1)}h`, 'Sleep Duration']}
              />
              <Area 
                type="monotone" 
                dataKey="sleepDuration" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Heart Rate & Stress */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Heart Rate & Stress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={healthStats.last30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis 
                dataKey="date" 
                stroke="#737373"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" stroke="#ef4444" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #262626',
                  borderRadius: '8px'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="avgHeartRate" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Heart Rate (bpm)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="stressLevel" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Stress Level"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Pattern Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Weekly Health Patterns</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={healthStats.last7Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis 
              dataKey="dayOfWeek" 
              stroke="#737373"
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="#737373" tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#111111', 
                border: '1px solid #262626',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="sleepHours" fill="#3b82f6" name="Sleep (hours)" />
            <Bar dataKey="avgHeartRate" fill="#ef4444" name="Heart Rate" />
            <Bar dataKey="stressLevel" fill="#f59e0b" name="Stress Level" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Health Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sleep Analysis */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Sleep Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Average Sleep Duration</p>
                <p className="text-sm text-text-muted">Last 30 days</p>
              </div>
              <span className="text-lg font-semibold text-accent-primary">
                {healthStats.avgSleep}h
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Sleep Consistency</p>
                <p className="text-sm text-text-muted">Standard deviation</p>
              </div>
              <span className="text-lg font-semibold text-accent-warning">
                ±2.1h
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Best Sleep Day</p>
                <p className="text-sm text-text-muted">Longest duration</p>
              </div>
              <span className="text-lg font-semibold text-accent-success">
                13.8h
              </span>
            </div>
          </div>
        </div>

        {/* Health Correlations */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Health-Habit Correlations</h3>
          <div className="space-y-4">
            <div className="p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-accent-success">✅</span>
                <span className="font-medium text-accent-success">Strong Positive</span>
              </div>
              <p className="text-sm text-text-secondary">
                Early wake correlates with 8+ hours sleep (r=0.73)
              </p>
            </div>
            
            <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-accent-primary">📊</span>
                <span className="font-medium text-accent-primary">Moderate</span>
              </div>
              <p className="text-sm text-text-secondary">
                Low stress days improve gym performance (r=0.45)
              </p>
            </div>
            
            <div className="p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-accent-warning">⚠️</span>
                <span className="font-medium text-accent-warning">Needs Attention</span>
              </div>
              <p className="text-sm text-text-secondary">
                Heart rate spikes on coding-heavy days (avg +15 bpm)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Adherence */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Medication Adherence (30 days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-accent-success/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-success">
                {healthStats.medicationAdherence.bupropion}%
              </span>
            </div>
            <p className="font-medium text-text-primary">Bupropion</p>
            <p className="text-sm text-text-muted">Morning + Afternoon</p>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-primary">
                {healthStats.medicationAdherence.melatonin}%
              </span>
            </div>
            <p className="font-medium text-text-primary">Melatonin</p>
            <p className="text-sm text-text-muted">Evening</p>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-accent-warning/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-warning">
                {Math.round((healthStats.medicationAdherence.bupropion + healthStats.medicationAdherence.melatonin) / 2)}%
              </span>
            </div>
            <p className="font-medium text-text-primary">Overall</p>
            <p className="text-sm text-text-muted">All medications</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Health Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.href = '/import'}
            className="flex items-center justify-center px-4 py-3 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/20 text-accent-primary rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import New Data
          </button>
          
          <button 
            onClick={() => alert('Manual health entry coming soon!')}
            className="flex items-center justify-center px-4 py-3 bg-accent-success/10 hover:bg-accent-success/20 border border-accent-success/20 text-accent-success rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Log Health Metric
          </button>
          
          <button 
            onClick={() => window.location.href = '/analytics'}
            className="flex items-center justify-center px-4 py-3 bg-accent-warning/10 hover:bg-accent-warning/20 border border-accent-warning/20 text-accent-warning rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}