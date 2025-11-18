// Assignment Breakdown Component
// Breaks down assignments into manageable tasks and creates study schedule

import React, { useState } from 'react';
import type {
    Assignment,
    AssignmentBreakdown,
    AssignmentTask,
    StudyBlock,
    AssignmentBreakdownRequest
} from '../../types/uk-student-academic';

interface AssignmentBreakdownProps {
    assignment: Assignment;
    onBreakdownComplete?: (breakdown: AssignmentBreakdown) => void;
}

export const AssignmentBreakdownComponent: React.FC<AssignmentBreakdownProps> = ({
    assignment,
    onBreakdownComplete
}) => {
    const [breakdown, setBreakdown] = useState<AssignmentBreakdown | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferences, setPreferences] = useState({
        daily_study_hours: 3,
        preferred_session_duration: 90,
        avoid_weekends: false,
        morning_person: true
    });

    const handleBreakdown = async () => {
        try {
            setLoading(true);
            setError(null);

            const request: AssignmentBreakdownRequest = {
                assignment_id: assignment.id,
                preferences
            };

            const response = await fetch('/api/uk-student/academic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'breakdown_assignment',
                    ...request
                })
            });

            const result = await response.json();

            if (result.success) {
                setBreakdown(result.data);
                onBreakdownComplete?.(result.data);
            } else {
                setError(result.error || 'Failed to breakdown assignment');
            }
        } catch (err) {
            setError('Failed to breakdown assignment');
            console.error('Breakdown error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Assignment Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Assignment Breakdown</h2>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                    <h3 className="font-medium text-blue-900">{assignment.title}</h3>
                    <p className="text-sm text-blue-700">{assignment.course_name} • {assignment.assignment_type}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-blue-600">
                        <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                        {assignment.word_count && <span>{assignment.word_count} words</span>}
                        <span>{assignment.estimated_hours}h estimated</span>
                    </div>
                </div>

                {/* Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Daily Study Hours
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={preferences.daily_study_hours}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                daily_study_hours: parseInt(e.target.value)
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Duration (minutes)
                        </label>
                        <select
                            value={preferences.preferred_session_duration}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                preferred_session_duration: parseInt(e.target.value)
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                            <option value={180}>3 hours</option>
                        </select>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="avoid_weekends"
                            checked={preferences.avoid_weekends}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                avoid_weekends: e.target.checked
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="avoid_weekends" className="ml-2 text-sm text-gray-700">
                            Avoid weekends
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="morning_person"
                            checked={preferences.morning_person}
                            onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                morning_person: e.target.checked
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="morning_person" className="ml-2 text-sm text-gray-700">
                            Prefer morning sessions
                        </label>
                    </div>
                </div>

                {/* Breakdown Button */}
                <button
                    onClick={handleBreakdown}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Breaking down assignment...
                        </div>
                    ) : (
                        'Break Down Assignment'
                    )}
                </button>

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
            </div>

            {/* Breakdown Results */}
            {breakdown && (
                <div className="space-y-6">
                    {/* Tasks Overview */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{breakdown.tasks.length}</div>
                                <div className="text-sm text-blue-700">Total Tasks</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{Math.round(breakdown.total_estimated_hours)}h</div>
                                <div className="text-sm text-green-700">Total Hours</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">{breakdown.suggested_schedule.length}</div>
                                <div className="text-sm text-purple-700">Study Sessions</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {breakdown.tasks.map((task, index) => (
                                <TaskCard key={index} task={task} index={index} />
                            ))}
                        </div>
                    </div>

                    {/* Study Schedule */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Study Schedule</h3>
                        <div className="space-y-3">
                            {breakdown.suggested_schedule.map((block, index) => (
                                <ScheduleBlock key={index} block={block} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components
const TaskCard: React.FC<{ task: AssignmentTask; index: number }> = ({ task, index }) => {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getComplexityIcon = (complexity: string) => {
        switch (complexity) {
            case 'simple': return '●';
            case 'moderate': return '●●';
            case 'complex': return '●●●';
            default: return '●';
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{Math.round(task.estimated_duration / 60)}h {task.estimated_duration % 60}m</span>
                        <span>Complexity: {getComplexityIcon(task.complexity)}</span>
                        <span>Energy: {task.energy_required}</span>
                        <span>Due in {task.deadline_offset_days} days</span>
                    </div>
                    {task.dependencies && task.dependencies.length > 0 && (
                        <div className="mt-2">
                            <span className="text-xs text-gray-500">Depends on: </span>
                            <span className="text-xs text-blue-600">{task.dependencies.join(', ')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ScheduleBlock: React.FC<{ block: StudyBlock }> = ({ block }) => {
    const getSessionTypeColor = (type: string) => {
        switch (type) {
            case 'research': return 'bg-blue-100 text-blue-800';
            case 'writing': return 'bg-green-100 text-green-800';
            case 'revision': return 'bg-purple-100 text-purple-800';
            case 'reading': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getEnergyIcon = (energy: string) => {
        switch (energy) {
            case 'high': return '🔥';
            case 'medium': return '⚡';
            case 'low': return '💤';
            default: return '⚡';
        }
    };

    return (
        <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <div className="flex-shrink-0 w-20 text-sm text-gray-600">
                {new Date(block.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                })}
            </div>
            <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                {block.start_time} - {block.end_time}
            </div>
            <div className="flex-1 ml-4">
                <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{block.task_title}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getSessionTypeColor(block.session_type)}`}>
                        {block.session_type}
                    </span>
                    <span className="text-sm">{getEnergyIcon(block.energy_level)}</span>
                </div>
            </div>
        </div>
    );
};

export default AssignmentBreakdownComponent;