// src/components/uk-student/RoutineTracker.tsx
import React, { useState, useEffect } from 'react';
import type { Routine as RoutineType } from '../../types/uk-student';

interface RoutineTrackerProps {
  routine: RoutineType;
  onComplete?: (stepsCompleted: string[], totalDuration: number) => void;
  onMiss?: (reason?: string) => void;
}

export const RoutineTracker: React.FC<RoutineTrackerProps> = ({
  routine,
  onComplete,
  onMiss,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showMissDialog, setShowMissDialog] = useState(false);
  const [missReason, setMissReason] = useState('');

  const startTracking = () => {
    setStartTime(new Date());
    setIsTracking(true);
    setCompletedSteps(new Set());
  };

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const completeRoutine = () => {
    if (!startTime) return;

    const totalDuration = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
    onComplete?.(Array.from(completedSteps), totalDuration);

    // Reset
    setIsTracking(false);
    setStartTime(null);
    setCompletedSteps(new Set());
  };

  const recordMiss = () => {
    onMiss?.(missReason || undefined);
    setShowMissDialog(false);
    setMissReason('');
  };

  const completionPercentage = (completedSteps.size / routine.steps.length) * 100;

  return (
    <div className="routine-tracker p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{routine.name}</h2>
          <p className="text-gray-600">
            {routine.estimated_duration} minutes • {routine.frequency}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{routine.completion_streak}</div>
          <p className="text-sm text-gray-600">day streak</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{Math.round(completionPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {routine.steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <input
              type="checkbox"
              checked={completedSteps.has(step.id)}
              onChange={() => toggleStep(step.id)}
              disabled={!isTracking}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex-grow">
              <div className="font-medium text-gray-900">{step.name}</div>
              {step.description && (
                <p className="text-sm text-gray-600">{step.description}</p>
              )}
            </div>
            <div className="text-sm text-gray-600 flex-shrink-0">
              {step.estimated_duration} min
            </div>
          </div>
        ))}
      </div>

      {/* Timer Display */}
      {isTracking && startTime && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Elapsed Time</p>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round((new Date().getTime() - startTime.getTime()) / 60000)} min
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isTracking ? (
          <>
            <button
              onClick={startTracking}
              className="flex-grow px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
            >
              Start Routine
            </button>
            <button
              onClick={() => setShowMissDialog(true)}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Mark as Missed
            </button>
          </>
        ) : (
          <>
            <button
              onClick={completeRoutine}
              className="flex-grow px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
            >
              Complete Routine
            </button>
            <button
              onClick={() => {
                setIsTracking(false);
                setStartTime(null);
                setCompletedSteps(new Set());
              }}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Miss Dialog */}
      {showMissDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Mark Routine as Missed</h3>
            <p className="text-gray-600 mb-4">
              What prevented you from completing this routine?
            </p>
            <textarea
              value={missReason}
              onChange={(e) => setMissReason(e.target.value)}
              placeholder="Optional: Share what happened..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={recordMiss}
                className="flex-grow px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                Record Miss
              </button>
              <button
                onClick={() => {
                  setShowMissDialog(false);
                  setMissReason('');
                }}
                className="flex-grow px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
