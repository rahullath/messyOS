// src/components/habits/analytics/ContextSuccessRates.tsx - Context correlation analysis
import React, { useMemo } from 'react';

interface HabitEntry {
  id: string;
  habit_id: string;
  value: number;
  date: string;
  effort?: number;
  mood?: number;
  energy_level?: number;
  location?: string;
  weather?: string;
  context_tags?: string[];
}

interface AnalyticsData {
  habits: Array<{ id: string; name: string; color: string }>;
  entries: HabitEntry[];
}

interface ContextSuccessRatesProps {
  data: AnalyticsData;
}

export function ContextSuccessRates({ data }: ContextSuccessRatesProps) {
  const contextAnalysis = useMemo(() => {
    const entriesWithContext = data.entries.filter(e => 
      e.effort || e.mood || e.energy_level || e.location || e.weather || e.context_tags?.length
    );

    if (entriesWithContext.length === 0) {
      return null;
    }

    // Analyze mood correlation
    const moodAnalysis = [1, 2, 3, 4, 5].map(mood => {
      const moodEntries = entriesWithContext.filter(e => e.mood === mood);
      const successRate = moodEntries.length > 0 ? 
        moodEntries.filter(e => e.value === 1).length / moodEntries.length : 0;
      return { mood, count: moodEntries.length, successRate };
    }).filter(m => m.count > 0);

    // Analyze energy correlation
    const energyAnalysis = [1, 2, 3, 4, 5].map(energy => {
      const energyEntries = entriesWithContext.filter(e => e.energy_level === energy);
      const successRate = energyEntries.length > 0 ? 
        energyEntries.filter(e => e.value === 1).length / energyEntries.length : 0;
      return { energy, count: energyEntries.length, successRate };
    }).filter(e => e.count > 0);

    // Analyze effort correlation
    const effortAnalysis = [1, 2, 3, 4, 5].map(effort => {
      const effortEntries = entriesWithContext.filter(e => e.effort === effort);
      const successRate = effortEntries.length > 0 ? 
        effortEntries.filter(e => e.value === 1).length / effortEntries.length : 0;
      return { effort, count: effortEntries.length, successRate };
    }).filter(e => e.count > 0);

    // Analyze location correlation
    const locationCounts: Record<string, { count: number; success: number }> = {};
    entriesWithContext.forEach(entry => {
      if (entry.location) {
        if (!locationCounts[entry.location]) {
          locationCounts[entry.location] = { count: 0, success: 0 };
        }
        locationCounts[entry.location].count++;
        if (entry.value === 1) {
          locationCounts[entry.location].success++;
        }
      }
    });

    const locationAnalysis = Object.entries(locationCounts)
      .map(([location, data]) => ({
        location,
        count: data.count,
        successRate: data.success / data.count
      }))
      .filter(l => l.count >= 3) // Only show locations with at least 3 entries
      .sort((a, b) => b.successRate - a.successRate);

    // Analyze weather correlation
    const weatherCounts: Record<string, { count: number; success: number }> = {};
    entriesWithContext.forEach(entry => {
      if (entry.weather) {
        if (!weatherCounts[entry.weather]) {
          weatherCounts[entry.weather] = { count: 0, success: 0 };
        }
        weatherCounts[entry.weather].count++;
        if (entry.value === 1) {
          weatherCounts[entry.weather].success++;
        }
      }
    });

    const weatherAnalysis = Object.entries(weatherCounts)
      .map(([weather, data]) => ({
        weather,
        count: data.count,
        successRate: data.success / data.count
      }))
      .filter(w => w.count >= 3)
      .sort((a, b) => b.successRate - a.successRate);

    // Analyze context tags
    const tagCounts: Record<string, { count: number; success: number }> = {};
    entriesWithContext.forEach(entry => {
      if (entry.context_tags) {
        entry.context_tags.forEach(tag => {
          if (!tagCounts[tag]) {
            tagCounts[tag] = { count: 0, success: 0 };
          }
          tagCounts[tag].count++;
          if (entry.value === 1) {
            tagCounts[tag].success++;
          }
        });
      }
    });

    const tagAnalysis = Object.entries(tagCounts)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        successRate: data.success / data.count
      }))
      .filter(t => t.count >= 3)
      .sort((a, b) => b.successRate - a.successRate);

    return {
      mood: moodAnalysis,
      energy: energyAnalysis,
      effort: effortAnalysis,
      location: locationAnalysis,
      weather: weatherAnalysis,
      tags: tagAnalysis,
      totalEntries: entriesWithContext.length
    };
  }, [data]);

  if (!contextAnalysis) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Context Data</h3>
          <p className="text-text-secondary">
            Use enhanced logging to track context data and see success correlations.
          </p>
        </div>
      </div>
    );
  }

  const getMoodEmoji = (mood: number) => {
    const emojis = ['😔', '😕', '😐', '😊', '😄'];
    return emojis[mood - 1] || '😐';
  };

  const getEnergyEmoji = (energy: number) => {
    const emojis = ['🔋', '🔋', '🔋', '🔋', '⚡'];
    return emojis[energy - 1] || '🔋';
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 0.8) return 'text-accent-success';
    if (rate >= 0.6) return 'text-accent-warning';
    return 'text-accent-error';
  };

  const getBarWidth = (rate: number) => `${rate * 100}%`;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Context Success Rates</h3>
            <p className="text-sm text-text-secondary">
              How different contexts affect your habit success
            </p>
          </div>
          <div className="text-sm text-text-muted">
            {contextAnalysis.totalEntries} entries with context
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Analysis */}
          {contextAnalysis.mood.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-text-primary flex items-center">
                <span className="mr-2">😊</span>
                Mood Impact
              </h4>
              <div className="space-y-3">
                {contextAnalysis.mood.map(item => (
                  <div key={item.mood} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMoodEmoji(item.mood)}</span>
                        <span className="text-sm text-text-primary">
                          Mood {item.mood}
                        </span>
                        <span className="text-xs text-text-muted">
                          ({item.count} entries)
                        </span>
                      </div>
                      <span className={`font-semibold ${getSuccessColor(item.successRate)}`}>
                        {Math.round(item.successRate * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-accent-primary transition-all duration-500"
                        style={{ width: getBarWidth(item.successRate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Energy Analysis */}
          {contextAnalysis.energy.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-text-primary flex items-center">
                <span className="mr-2">⚡</span>
                Energy Impact
              </h4>
              <div className="space-y-3">
                {contextAnalysis.energy.map(item => (
                  <div key={item.energy} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getEnergyEmoji(item.energy)}</span>
                        <span className="text-sm text-text-primary">
                          Energy {item.energy}
                        </span>
                        <span className="text-xs text-text-muted">
                          ({item.count} entries)
                        </span>
                      </div>
                      <span className={`font-semibold ${getSuccessColor(item.successRate)}`}>
                        {Math.round(item.successRate * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-accent-success transition-all duration-500"
                        style={{ width: getBarWidth(item.successRate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Analysis */}
          {contextAnalysis.location.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-text-primary flex items-center">
                <span className="mr-2">📍</span>
                Location Impact
              </h4>
              <div className="space-y-3">
                {contextAnalysis.location.slice(0, 5).map(item => (
                  <div key={item.location} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-primary">
                          {item.location}
                        </span>
                        <span className="text-xs text-text-muted">
                          ({item.count} entries)
                        </span>
                      </div>
                      <span className={`font-semibold ${getSuccessColor(item.successRate)}`}>
                        {Math.round(item.successRate * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-accent-warning transition-all duration-500"
                        style={{ width: getBarWidth(item.successRate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context Tags Analysis */}
          {contextAnalysis.tags.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-text-primary flex items-center">
                <span className="mr-2">🏷️</span>
                Context Tags
              </h4>
              <div className="space-y-3">
                {contextAnalysis.tags.slice(0, 5).map(item => (
                  <div key={item.tag} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-primary">
                          {item.tag}
                        </span>
                        <span className="text-xs text-text-muted">
                          ({item.count} entries)
                        </span>
                      </div>
                      <span className={`font-semibold ${getSuccessColor(item.successRate)}`}>
                        {Math.round(item.successRate * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-accent-purple transition-all duration-500"
                        style={{ width: getBarWidth(item.successRate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Key Insights */}
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="font-medium text-text-primary mb-3">Key Insights</h4>
          <div className="space-y-2 text-sm">
            {contextAnalysis.mood.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-accent-success">✓</span>
                <span className="text-text-secondary">
                  Best mood for success: {getMoodEmoji(contextAnalysis.mood[0].mood)} Mood {contextAnalysis.mood[0].mood} 
                  ({Math.round(contextAnalysis.mood[0].successRate * 100)}% success rate)
                </span>
              </div>
            )}
            {contextAnalysis.energy.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-accent-success">✓</span>
                <span className="text-text-secondary">
                  Optimal energy level: {getEnergyEmoji(contextAnalysis.energy[0].energy)} Energy {contextAnalysis.energy[0].energy}
                  ({Math.round(contextAnalysis.energy[0].successRate * 100)}% success rate)
                </span>
              </div>
            )}
            {contextAnalysis.location.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-accent-success">✓</span>
                <span className="text-text-secondary">
                  Most successful location: {contextAnalysis.location[0].location}
                  ({Math.round(contextAnalysis.location[0].successRate * 100)}% success rate)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContextSuccessRates;