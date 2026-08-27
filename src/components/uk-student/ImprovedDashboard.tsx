// Improved UK Student Dashboard - Modern, Clean, Actually Useful
import React, { useState, useEffect } from 'react';
import type { UKStudentProfile } from '../../types/uk-student';

interface ImprovedDashboardProps {
  userId: string;
  profile: UKStudentProfile;
}

interface DashboardStats {
  weeklySpent: number;
  weeklyBudget: number;
  inventoryItems: number;
  expiringItems: number;
  upcomingDeadlines: number;
  completedTasks: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: string;
}

export const ImprovedDashboard: React.FC<ImprovedDashboardProps> = ({ userId, profile }) => {
  const [stats, setStats] = useState<DashboardStats>({
    weeklySpent: 0,
    weeklyBudget: 200,
    inventoryItems: 0,
    expiringItems: 0,
    upcomingDeadlines: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    checkFirstVisit();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const checkFirstVisit = () => {
    const hasVisited = localStorage.getItem('uk-student-visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('uk-student-visited', 'true');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/uk-student/dashboard?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();

      setWeather(data.weather?.conditions || null);
      setStats({
        weeklySpent: data.stats?.weeklySpent || 0,
        weeklyBudget: data.stats?.weeklyBudget || 200,
        inventoryItems: data.stats?.inventoryItems || 0,
        expiringItems: data.stats?.expiringItems || 0,
        upcomingDeadlines: data.stats?.upcomingDeadlines || 0,
        completedTasks: 0
      });
      setTodaySchedule(data.today_schedule || []);
      setUpcomingDeadlines(data.upcoming_deadlines || []);
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'add-expense',
      title: 'Log Expense',
      description: 'Quick expense entry',
      icon: '💰',
      action: () => window.location.href = '#expenses',
      color: 'bg-green-500'
    },
    {
      id: 'add-inventory',
      title: 'Add to Inventory',
      description: 'Track groceries',
      icon: '🛒',
      action: () => window.location.href = '#inventory',
      color: 'bg-blue-500'
    },
    {
      id: 'plan-meal',
      title: 'Plan Meals',
      description: 'Weekly meal planning',
      icon: '🍽️',
      action: () => window.location.href = '#meals',
      color: 'bg-purple-500'
    },
    {
      id: 'check-weather',
      title: 'Travel Check',
      description: 'Bike or train today?',
      icon: '🚴',
      action: () => window.location.href = '#travel',
      color: 'bg-orange-500'
    }
  ];

  const budgetPercentage = (stats.weeklySpent / stats.weeklyBudget) * 100;
  const budgetStatus = budgetPercentage >= 90 ? 'critical' : budgetPercentage >= 70 ? 'warning' : 'good';

  if (isFirstVisit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to UK Student Life</h1>
            <p className="text-gray-600">Your Birmingham student life optimization tool</p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
              <ul className="space-y-2 text-blue-800">
                <li>📊 Track your budget across Monzo, iQ Prepaid, ICICI UK</li>
                <li>🍽️ Plan meals and manage grocery inventory</li>
                <li>🚴 Optimize travel between Five Ways, Uni, and Selly Oak</li>
                <li>📚 Manage assignments and study sessions</li>
                <li>🧴 Track routines: skincare, laundry, personal care</li>
              </ul>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Quick Setup:</h3>
              <p className="text-yellow-800 text-sm">
                We'll help you set up your home location (Five Ways or Selly Oak),
                budget limits, and meal preferences. This takes about 2 minutes.
              </p>
            </div>

            <button
              onClick={() => setIsFirstVisit(false)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadDashboardData()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Good {getTimeOfDay()}, Student! 👋</h1>
              <p className="text-blue-100 mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {weather && (
              <div className="text-right">
                <div className="text-4xl mb-1">{getWeatherIcon(weather.condition)}</div>
                <div className="text-2xl font-bold">{Math.round(weather.temperature)}°C</div>
                <div className="text-sm text-blue-100">{weather.condition}</div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="💷"
              label="Weekly Spent"
              value={`£${stats.weeklySpent.toFixed(2)}`}
              subtitle={`of £${stats.weeklyBudget}`}
              status={budgetStatus}
            />
            <StatCard
              icon="🧊"
              label="Inventory"
              value={stats.inventoryItems.toString()}
              subtitle={`${stats.expiringItems} expiring soon`}
              status={stats.expiringItems > 0 ? 'warning' : 'good'}
            />
            <StatCard
              icon="📚"
              label="Deadlines"
              value={stats.upcomingDeadlines.toString()}
              subtitle="this week"
              status={stats.upcomingDeadlines > 3 ? 'warning' : 'good'}
            />
            <StatCard
              icon="✅"
              label="Tasks Done"
              value={stats.completedTasks.toString()}
              subtitle="today"
              status="good"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Travel Recommendation */}
        {weather && (
          <div className="mb-8">
            <div className={`rounded-xl p-6 ${
              getTravelRecommendation(weather).mode === 'bike'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {getTravelRecommendation(weather).mode === 'bike' ? '🚴 Bike Day!' : '🚆 Train Day'}
                  </h3>
                  <p className="text-gray-700">
                    {getTravelRecommendation(weather).reason}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {getTravelRecommendation(weather).details}
                  </p>
                </div>
                <div className="text-6xl ml-6">
                  {getTravelRecommendation(weather).mode === 'bike' ? '🚴' : '🚆'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={action.action}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 text-left group"
              >
                <div className={`text-4xl mb-3 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={alert.id || idx}
                  className={`rounded-lg p-4 border-l-4 ${
                    alert.severity === 'error' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                    </div>
                    <span className="text-2xl ml-4">
                      {alert.severity === 'error' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Overview */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Weekly Budget</h3>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  £{stats.weeklySpent.toFixed(2)} spent
                </span>
                <span className="text-sm text-gray-600">
                  {budgetPercentage.toFixed(0)}% of budget
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    budgetStatus === 'critical' ? 'bg-red-500' :
                    budgetStatus === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {budgetStatus === 'critical' && '⚠️ You\'re over budget this week!'}
              {budgetStatus === 'warning' && '⚡ Getting close to your weekly limit'}
              {budgetStatus === 'good' && '✅ You\'re on track with your budget'}
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Schedule</h3>
            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.slice(0, 5).map((event, idx) => (
                  <FocusItem
                    key={event.id || idx}
                    icon={getEventIcon(event.type)}
                    text={`${event.title} - ${formatTime(event.start_time)}`}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm text-gray-600">No events scheduled for today</p>
                <button
                  onClick={() => window.location.href = '#calendar'}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add an event
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Deadlines</h2>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 5).map((deadline, idx) => (
                  <div
                    key={deadline.id || idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getEventIcon(deadline.type)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{deadline.title}</div>
                        <div className="text-sm text-gray-600">
                          {deadline.module_code || 'General'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(deadline.start_time)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getDaysUntil(deadline.start_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  subtitle: string;
  status: 'good' | 'warning' | 'critical';
}> = ({ icon, label, value, subtitle, status }) => {
  const bgColor = status === 'critical' ? 'bg-red-500/10' : status === 'warning' ? 'bg-yellow-500/10' : 'bg-white/10';

  return (
    <div className={`${bgColor} backdrop-blur-sm rounded-lg p-4`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-blue-100 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-blue-200 mt-1">{subtitle}</div>
    </div>
  );
};

const FocusItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
    <span className="text-2xl">{icon}</span>
    <span className="text-sm font-medium text-gray-700">{text}</span>
  </div>
);

// Helper Functions
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const getWeatherIcon = (condition: string) => {
  const icons: Record<string, string> = {
    'clear': '☀️',
    'sunny': '☀️',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'snow': '❄️',
    'windy': '💨'
  };
  return icons[condition.toLowerCase()] || '🌤️';
};

const getEventIcon = (type: string) => {
  const icons: Record<string, string> = {
    'lecture': '📚',
    'seminar': '💬',
    'lab': '🔬',
    'exam': '📝',
    'deadline': '⏰',
    'assignment': '📄',
    'meeting': '👥',
    'study': '📖'
  };
  return icons[type.toLowerCase()] || '📅';
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

const getDaysUntil = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return 'Overdue';
  return `${diffDays} days`;
};

const getTravelRecommendation = (weather: any) => {
  const temp = weather.temperature || 12;
  const condition = weather.condition || 'cloudy';
  const precipitation = weather.precipitation_chance || 0;
  const windSpeed = weather.wind_speed || 15;

  // Bike-friendly conditions
  if (
    condition === 'sunny' ||
    (condition === 'cloudy' && precipitation < 30 && windSpeed < 25 && temp > 8)
  ) {
    return {
      mode: 'bike',
      reason: 'Perfect biking weather!',
      details: `${temp}°C, ${condition}, ${precipitation}% rain chance. Save £2.05!`
    };
  }

  // Train recommended
  return {
    mode: 'train',
    reason: 'Better take the train today',
    details: condition === 'rainy'
      ? 'Rainy conditions. Train to University: £2.05'
      : temp < 5
      ? `Too cold (${temp}°C). Train to University: £2.05`
      : windSpeed > 25
      ? `Too windy (${windSpeed} km/h). Train: £2.05`
      : 'Weather not ideal for biking. Train: £2.05'
  };
};
