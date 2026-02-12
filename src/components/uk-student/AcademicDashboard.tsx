// UK Student Academic Dashboard Component
// Main dashboard for assignment management and study session tracking

import React, { useState, useEffect } from 'react';
import type { 
  AcademicDashboardData, 
  Assignment, 
  AcademicDeadline,
  StudySession 
} from '../../types/uk-student-academic';

interface AcademicDashboardProps {
  userId: string;
}

export const AcademicDashboard: React.FC<AcademicDashboardProps> = ({ userId }) => {
  const [dashboardData, setDashboardData] = useState<AcademicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/uk-student/academic?action=dashboard');
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading academic dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button 
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-8 text-gray-500">
        No academic data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Academic Dashboard</h1>
        <p className="text-gray-600">Track your assignments, deadlines, and study progress</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Active Assignments</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardData.current_assignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Upcoming Deadlines</p>
              <p className="text-2xl font-bold text-yellow-600">{dashboardData.upcoming_deadlines.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Weekly Progress</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(dashboardData.weekly_progress.completion_rate * 100)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Today's Sessions</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardData.today_study_sessions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
        </div>
        <div className="p-6">
          {dashboardData.upcoming_deadlines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
          ) : (
            <div className="space-y-4">
              {dashboardData.upcoming_deadlines.map((deadline) => (
                <DeadlineCard key={deadline.assignment_id} deadline={deadline} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Assignments</h2>
        </div>
        <div className="p-6">
          {dashboardData.current_assignments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active assignments</p>
          ) : (
            <div className="space-y-4">
              {dashboardData.current_assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Study Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Study Sessions</h2>
        </div>
        <div className="p-6">
          {dashboardData.today_study_sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No study sessions scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {dashboardData.today_study_sessions.map((session) => (
                <StudySessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-components
const DeadlineCard: React.FC<{ deadline: AcademicDeadline }> = ({ deadline }) => {
  const getUrgencyColor = (urgency: string, days: number) => {
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (urgency === 'critical' || days <= 2) return 'text-red-600 bg-red-50 border-red-200';
    if (urgency === 'high' || days <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className={`p-4 rounded-lg border ${getUrgencyColor(deadline.urgency_level, deadline.days_remaining)}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{deadline.title}</h3>
          <p className="text-sm text-gray-600">{deadline.course_name}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm">
            <span>
              {deadline.days_remaining < 0 
                ? `${Math.abs(deadline.days_remaining)} days overdue`
                : deadline.days_remaining === 0 
                ? 'Due today'
                : `${deadline.days_remaining} days remaining`
              }
            </span>
            <span>{Math.round(deadline.completion_percentage)}% complete</span>
            <span>{deadline.estimated_hours_remaining}h remaining</span>
          </div>
        </div>
        <div className="ml-4">
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-blue-600 rounded-full" 
              style={{ width: `${Math.min(100, deadline.completion_percentage)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssignmentCard: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const completionPercentage = assignment.current_word_count && assignment.word_count 
    ? (assignment.current_word_count / assignment.word_count) * 100 
    : 0;

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{assignment.title}</h3>
          <p className="text-sm text-gray-600">{assignment.course_name} • {assignment.assignment_type}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
            {assignment.word_count && (
              <span>{assignment.current_word_count || 0} / {assignment.word_count} words</span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs ${
              assignment.status === 'not_started' ? 'bg-gray-100 text-gray-800' :
              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              assignment.status === 'draft_complete' ? 'bg-green-100 text-green-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {assignment.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="ml-4 text-right">
          <div className="text-sm font-medium text-gray-900">
            {Math.round(completionPercentage)}%
          </div>
          <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
            <div 
              className="h-2 bg-blue-600 rounded-full" 
              style={{ width: `${Math.min(100, completionPercentage)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudySessionCard: React.FC<{ session: StudySession }> = ({ session }) => {
  return (
    <div className="flex items-center p-3 border border-gray-200 rounded-lg">
      <div className="flex-shrink-0">
        <div className={`w-3 h-3 rounded-full ${
          session.completed ? 'bg-green-500' : 'bg-gray-300'
        }`}></div>
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-900">{session.title}</p>
        <p className="text-xs text-gray-500">
          {session.session_type} • {session.planned_duration} min
          {session.start_time && ` • ${new Date(session.start_time).toLocaleTimeString()}`}
        </p>
      </div>
      {session.productivity_rating && (
        <div className="ml-3 text-sm text-gray-500">
          {session.productivity_rating}/10
        </div>
      )}
    </div>
  );
};

export default AcademicDashboard;