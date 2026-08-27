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

  useEffect(() => {
    loadDashboardData();
    checkFirstVisit();
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
    try {
      // Load real data from APIs
      const [weatherData, budgetData, inventoryData] = await Promise.all([
        fetchWeather(),
        fetchBudgetStats(),
        fetchInventoryStats()
      ]);

      setWeather(weatherData);
      setStats(prev => ({
        ...prev,
        ...budgetData,
        ...inventoryData
      }));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      const response = await fetch('/api/uk-student/location/weather');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
    return {
      temperature: 12,
      condition: 'cloudy',
      description: 'Loading weather...'
    };
  };

  const fetchBudgetStats = async () => {
    try {
      const response = await fetch(`/api/uk-student/budgets?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          weeklySpent: data.weeklySpent || 0,
          weeklyBudget: data.weeklyBudget || 200
        };
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    }
    return { weeklySpent: 0, weeklyBudget: 200 };
  };

  const fetchInventoryStats = async () => {
    try {
      const response = await fetch(`/api/uk-student/inventory?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          inventoryItems: data.items?.length || 0,
          expiringItems: data.expiringSoon?.length || 0
        };
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
    return { inventoryItems: 0, expiringItems: 0 };
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

          {/* Today's Focus */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Focus</h3>
            <div className="space-y-3">
              <FocusItem icon="🎓" text="Study Session at 2pm" />
              <FocusItem icon="🏋️" text="Gym after class" />
              <FocusItem icon="🍝" text="Cook dinner with leftovers" />
            </div>
          </div>
        </div>
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
