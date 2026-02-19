import React, { useState, useEffect } from 'react';
import type { EnergyState } from '../../types/daily-plan';

interface PlanGeneratorFormProps {
  onGenerate: (input: {
    wakeTime: string;
    sleepTime: string;
    energyState: EnergyState;
    manualAnchor?: {
      title: string;
      startTime: string;
      durationMinutes: number;
      location?: string;
      anchorType: 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';
      mustAttend: boolean;
      notes?: string;
    };
  }) => void;
  isGenerating?: boolean;
  manualAnchorRequired?: boolean;
}

/**
 * Calculate default wake time based on current time
 * Requirements: 8.1, 8.2, 8.5
 * 
 * - If current time < 12:00, default wake time = 07:00
 * - If current time >= 12:00, default wake time = now rounded down to nearest 15 min
 */
function calculateDefaultWakeTime(): string {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Requirement 8.1: If current time < 12:00, default to 07:00
  if (currentHour < 12) {
    return '07:00';
  }
  
  // Requirement 8.2: If current time >= 12:00, round down to nearest 15 minutes
  const currentMinute = now.getMinutes();
  const roundedMinute = Math.floor(currentMinute / 15) * 15;
  
  const hours = currentHour.toString().padStart(2, '0');
  const minutes = roundedMinute.toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

export default function PlanGeneratorForm({
  onGenerate,
  isGenerating = false,
  manualAnchorRequired = false,
}: PlanGeneratorFormProps) {
  // Requirement 8.5: Display the calculated default wake time
  const [wakeTime, setWakeTime] = useState(() => calculateDefaultWakeTime());
  const [sleepTime, setSleepTime] = useState('23:00');
  const [energyState, setEnergyState] = useState<EnergyState>('medium');
  const [manualAnchorEnabled, setManualAnchorEnabled] = useState(false);
  const [manualAnchorTitle, setManualAnchorTitle] = useState('');
  const [manualAnchorStartTime, setManualAnchorStartTime] = useState('10:00');
  const [manualAnchorDuration, setManualAnchorDuration] = useState(60);
  const [manualAnchorLocation, setManualAnchorLocation] = useState('');
  const [manualAnchorType, setManualAnchorType] = useState<'class' | 'seminar' | 'workshop' | 'appointment' | 'other'>('other');
  const [manualAnchorMustAttend, setManualAnchorMustAttend] = useState(true);
  const [manualAnchorNotes, setManualAnchorNotes] = useState('');
  
  // Update default wake time when component mounts or time changes significantly
  useEffect(() => {
    const defaultWakeTime = calculateDefaultWakeTime();
    setWakeTime(defaultWakeTime);
  }, []);

  useEffect(() => {
    if (!manualAnchorRequired) return;

    setManualAnchorEnabled(true);
    const timeout = setTimeout(() => {
      const titleInput = document.getElementById('manual-anchor-title') as HTMLInputElement | null;
      titleInput?.focus();
    }, 0);

    return () => clearTimeout(timeout);
  }, [manualAnchorRequired]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Requirement 8.3: Allow user to override the default wake time
    const payload: {
      wakeTime: string;
      sleepTime: string;
      energyState: EnergyState;
      manualAnchor?: {
        title: string;
        startTime: string;
        durationMinutes: number;
        location?: string;
        anchorType: 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';
        mustAttend: boolean;
        notes?: string;
      };
    } = { wakeTime, sleepTime, energyState };

    if (manualAnchorEnabled && manualAnchorTitle.trim()) {
      payload.manualAnchor = {
        title: manualAnchorTitle.trim(),
        startTime: manualAnchorStartTime,
        durationMinutes: Math.max(15, manualAnchorDuration),
        location: manualAnchorLocation.trim() || undefined,
        anchorType: manualAnchorType,
        mustAttend: manualAnchorMustAttend,
        notes: manualAnchorNotes.trim() || undefined,
      };
    }

    onGenerate(payload);
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
        <div className="border border-border rounded-lg p-4 space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-primary">Add manual anchor for today</span>
            <input
              type="checkbox"
              checked={manualAnchorEnabled}
              onChange={(e) => setManualAnchorEnabled(e.target.checked)}
              disabled={isGenerating}
              className="h-5 w-5 text-accent-primary focus:ring-accent-primary"
            />
          </label>

          {manualAnchorRequired && (
            <p className="text-xs text-accent-warning">
              A manual anchor is required because no calendar anchors were found for this day.
            </p>
          )}

          {manualAnchorEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="manual-anchor-title" className="block text-xs text-text-muted mb-1">Anchor title</label>
                <input
                  id="manual-anchor-title"
                  type="text"
                  value={manualAnchorTitle}
                  onChange={(e) => setManualAnchorTitle(e.target.value)}
                  placeholder="Example: Deep Work Session"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label htmlFor="manual-anchor-start" className="block text-xs text-text-muted mb-1">Start time</label>
                <input
                  id="manual-anchor-start"
                  type="time"
                  value={manualAnchorStartTime}
                  onChange={(e) => setManualAnchorStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label htmlFor="manual-anchor-duration" className="block text-xs text-text-muted mb-1">Duration (minutes)</label>
                <input
                  id="manual-anchor-duration"
                  type="number"
                  min={15}
                  step={5}
                  value={manualAnchorDuration}
                  onChange={(e) => setManualAnchorDuration(Number(e.target.value) || 60)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label htmlFor="manual-anchor-type" className="block text-xs text-text-muted mb-1">Anchor type</label>
                <select
                  id="manual-anchor-type"
                  value={manualAnchorType}
                  onChange={(e) => setManualAnchorType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                >
                  <option value="other">Other</option>
                  <option value="appointment">Appointment</option>
                  <option value="class">Class</option>
                  <option value="seminar">Seminar</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <input
                  id="manual-anchor-required"
                  type="checkbox"
                  checked={manualAnchorMustAttend}
                  onChange={(e) => setManualAnchorMustAttend(e.target.checked)}
                  disabled={isGenerating}
                  className="h-4 w-4 text-accent-primary focus:ring-accent-primary"
                />
                <label htmlFor="manual-anchor-required" className="text-xs text-text-muted">Must attend</label>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="manual-anchor-location" className="block text-xs text-text-muted mb-1">Location (optional)</label>
                <input
                  id="manual-anchor-location"
                  type="text"
                  value={manualAnchorLocation}
                  onChange={(e) => setManualAnchorLocation(e.target.value)}
                  placeholder="Home, Library, Campus Room, etc."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="manual-anchor-notes" className="block text-xs text-text-muted mb-1">Notes (optional)</label>
                <textarea
                  id="manual-anchor-notes"
                  value={manualAnchorNotes}
                  onChange={(e) => setManualAnchorNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}
        </div>

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
