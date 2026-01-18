import React, { useState } from 'react';
import type { EnergyState } from '../../types/daily-plan';

interface PlanGeneratorFormProps {
  onGenerate: (input: {
    wakeTime: string;
    sleepTime: string;
    energyState: EnergyState;
  }) => void;
  isGenerating?: boolean;
}

export default function PlanGeneratorForm({ onGenerate, isGenerating = false }: PlanGeneratorFormProps) {
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [energyState, setEnergyState] = useState<EnergyState>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ wakeTime, sleepTime, energyState });
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-text-primary mb-6">Generate Daily Plan</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Wake Time */}
        <div>
          <label htmlFor="wake-time" className="block text-sm font-medium text-text-primary mb-2">
            Wake Time
          </label>
          <input
            type="time"
            id="wake-time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary"
            disabled={isGenerating}
            required
          />
        </div>

        {/* Sleep Time */}
        <div>
          <label htmlFor="sleep-time" className="block text-sm font-medium text-text-primary mb-2">
            Sleep Time
          </label>
          <input
            type="time"
            id="sleep-time"
            value={sleepTime}
            onChange={(e) => setSleepTime(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary"
            disabled={isGenerating}
            required
          />
        </div>

        {/* Energy State */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Energy State
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors">
              <input
                type="radio"
                name="energy"
                value="low"
                checked={energyState === 'low'}
                onChange={(e) => setEnergyState(e.target.value as EnergyState)}
                className="mr-3 text-accent-primary focus:ring-accent-primary"
                disabled={isGenerating}
              />
              <div>
                <div className="font-medium text-text-primary">Low Energy</div>
                <div className="text-sm text-text-muted">1 task maximum, more rest time</div>
              </div>
            </label>

            <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors">
              <input
                type="radio"
                name="energy"
                value="medium"
                checked={energyState === 'medium'}
                onChange={(e) => setEnergyState(e.target.value as EnergyState)}
                className="mr-3 text-accent-primary focus:ring-accent-primary"
                disabled={isGenerating}
              />
              <div>
                <div className="font-medium text-text-primary">Medium Energy</div>
                <div className="text-sm text-text-muted">2 tasks maximum, balanced schedule</div>
              </div>
            </label>

            <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors">
              <input
                type="radio"
                name="energy"
                value="high"
                checked={energyState === 'high'}
                onChange={(e) => setEnergyState(e.target.value as EnergyState)}
                className="mr-3 text-accent-primary focus:ring-accent-primary"
                disabled={isGenerating}
              />
              <div>
                <div className="font-medium text-text-primary">High Energy</div>
                <div className="text-sm text-text-muted">3 tasks maximum, productive day</div>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Plan...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate Plan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
