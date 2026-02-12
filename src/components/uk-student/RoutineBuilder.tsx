// src/components/uk-student/RoutineBuilder.tsx
import React, { useState, useEffect } from 'react';
import type { Routine as RoutineType, RoutineStep as RoutineStepType } from '../../types/uk-student';

interface RoutineBuilderProps {
  onRoutineCreate?: (routine: RoutineType) => void;
  onRoutineUpdate?: (routine: RoutineType) => void;
  initialRoutine?: RoutineType;
  routineType: 'morning' | 'evening' | 'skincare' | 'laundry' | 'gym' | 'study';
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  onRoutineCreate,
  onRoutineUpdate,
  initialRoutine,
  routineType,
}) => {
  const [name, setName] = useState(initialRoutine?.name || '');
  const [steps, setSteps] = useState<RoutineStepType[]>(initialRoutine?.steps || []);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>(
    initialRoutine?.frequency || 'daily'
  );
  const [newStepName, setNewStepName] = useState('');
  const [newStepDuration, setNewStepDuration] = useState(5);

  const addStep = () => {
    if (!newStepName.trim()) return;

    const newStep: RoutineStepType = {
      id: `step-${Date.now()}`,
      name: newStepName,
      estimated_duration: newStepDuration,
      order: steps.length + 1,
      required: true,
    };

    setSteps([...steps, newStep]);
    setNewStepName('');
    setNewStepDuration(5);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
  };

  const updateStep = (stepId: string, updates: Partial<RoutineStepType>) => {
    setSteps(
      steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
  };

  const totalDuration = steps.reduce((sum, step) => sum + step.estimated_duration, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a routine name');
      return;
    }

    if (steps.length === 0) {
      alert('Please add at least one step');
      return;
    }

    const routine: RoutineType = {
      id: initialRoutine?.id || `routine-${Date.now()}`,
      user_id: initialRoutine?.user_id || '',
      routine_type: routineType,
      name,
      steps,
      estimated_duration: totalDuration,
      frequency,
      completion_streak: initialRoutine?.completion_streak || 0,
      is_active: true,
      created_at: initialRoutine?.created_at || new Date(),
      updated_at: new Date(),
    };

    if (initialRoutine) {
      onRoutineUpdate?.(routine);
    } else {
      onRoutineCreate?.(routine);
    }
  };

  return (
    <div className="routine-builder p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        {initialRoutine ? 'Edit' : 'Create'} {routineType.charAt(0).toUpperCase() + routineType.slice(1)} Routine
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Routine Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Routine Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Morning Skincare"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Steps */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Steps</h3>
            <span className="text-sm text-gray-600">
              Total time: {totalDuration} minutes
            </span>
          </div>

          {/* Steps List */}
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => updateStep(step.id, { name: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={step.estimated_duration}
                    onChange={(e) =>
                      updateStep(step.id, { estimated_duration: parseInt(e.target.value) })
                    }
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-600">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add New Step */}
          <div className="flex gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
              placeholder="Step name"
              className="flex-grow px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addStep()}
            />
            <input
              type="number"
              min="1"
              value={newStepDuration}
              onChange={(e) => setNewStepDuration(parseInt(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addStep}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Step
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-grow px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            {initialRoutine ? 'Update Routine' : 'Create Routine'}
          </button>
        </div>
      </form>
    </div>
  );
};
