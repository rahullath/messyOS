// src/components/onboarding/OnboardingFlow.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to messyOS',
    description: 'Let\'s set up your personalized life optimization system'
  },
  {
    id: 'modules',
    title: 'Choose Your Modules',
    description: 'Select the areas of life you want to optimize'
  },
  {
    id: 'theme',
    title: 'Customize Your Look',
    description: 'Pick colors and themes that inspire you'
  },
  {
    id: 'ai',
    title: 'Configure Your AI Coach',
    description: 'Set how proactive and what personality you prefer'
  },
  {
    id: 'integrations',
    title: 'Connect Your Data',
    description: 'Optionally connect external services for richer insights'
  }
];

const AVAILABLE_MODULES = [
  {
    id: 'habits',
    name: 'Habits & Goals',
    description: 'Track daily habits, build streaks, achieve long-term goals',
    icon: '🎯',
    category: 'personal'
  },
  {
    id: 'tasks',
    name: 'Tasks & Projects',
    description: 'Manage work, personal projects, and deadlines',
    icon: '✅',
    category: 'productivity'
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    description: 'Monitor fitness, sleep, nutrition, and vital signs',
    icon: '❤️',
    category: 'health'
  },
  {
    id: 'finance',
    name: 'Finance & Investments',
    description: 'Track expenses, investments, and financial goals',
    icon: '💰',
    category: 'finance'
  },
  {
    id: 'content',
    name: 'Content & Learning',
    description: 'Track movies, books, courses, and learning progress',
    icon: '📚',
    category: 'entertainment'
  },
  {
    id: 'social',
    name: 'Social & Relationships',
    description: 'Manage contacts, events, and relationship building',
    icon: '👥',
    category: 'social'
  },
  {
    id: 'travel',
    name: 'Travel & Adventures',
    description: 'Plan trips, track experiences, manage travel docs',
    icon: '✈️',
    category: 'lifestyle'
  },
  {
    id: 'home',
    name: 'Home & Environment',
    description: 'Manage household tasks, maintenance, and organization',
    icon: '🏠',
    category: 'lifestyle'
  }
];

const THEMES = [
  { id: 'dark', name: 'Dark', primary: '#1f2937', accent: '#06b6d4' },
  { id: 'light', name: 'Light', primary: '#ffffff', accent: '#0891b2' },
  { id: 'midnight', name: 'Midnight', primary: '#0f172a', accent: '#06b6d4' },
  { id: 'forest', name: 'Forest', primary: '#1f2937', accent: '#10b981' },
  { id: 'sunset', name: 'Sunset', primary: '#1f2937', accent: '#f59e0b' },
  { id: 'ocean', name: 'Ocean', primary: '#1e293b', accent: '#3b82f6' }
];

const AI_PERSONALITIES = [
  {
    id: 'professional',
    name: 'Professional Coach',
    description: 'Direct, data-driven, focused on results and efficiency'
  },
  {
    id: 'friendly',
    name: 'Friendly Mentor',
    description: 'Encouraging, supportive, celebrates small wins'
  },
  {
    id: 'analytical',
    name: 'Data Scientist',
    description: 'Detailed insights, patterns, statistical analysis'
  },
  {
    id: 'motivational',
    name: 'Life Coach',
    description: 'Inspiring, goal-oriented, pushes you to grow'
  }
];

const INTEGRATIONS = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Auto-extract tasks, appointments, and insights from emails',
    icon: '📧',
    category: 'productivity'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Track coding activity, commits, and project progress',
    icon: '🐙',
    category: 'productivity'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync notes, databases, and existing workflows',
    icon: '📝',
    category: 'productivity'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Analyze music patterns and mood correlations',
    icon: '🎵',
    category: 'entertainment'
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Import health data, steps, sleep, heart rate',
    icon: '⌚',
    category: 'health'
  },
  {
    id: 'bank',
    name: 'Banking',
    description: 'Automatically categorize and analyze expenses',
    icon: '🏦',
    category: 'finance'
  }
];

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState({
    enabledModules: ['habits', 'tasks', 'health', 'finance'],
    theme: 'dark',
    accentColor: '#06b6d4',
    aiPersonality: 'professional',
    aiProactivity: 3,
    selectedIntegrations: [] as string[]
  });

  // Using the supabase client imported above

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const savePreferences = async () => {
    try {
      console.log('🔄 Starting to save preferences...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      console.log('👤 User found:', user.id);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          enabled_modules: preferences.enabledModules,
          theme: preferences.theme,
          accent_color: preferences.accentColor,
          ai_personality: preferences.aiPersonality,
          ai_proactivity_level: preferences.aiProactivity,
          module_order: preferences.enabledModules
        });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Preferences saved successfully');
      
      // Dispatch a custom event instead of calling a prop
      const event = new CustomEvent('onboardingComplete');
      window.dispatchEvent(event);
      
      console.log('📡 Event dispatched');
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      savePreferences();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    const step = ONBOARDING_STEPS[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-white">Welcome to messyOS!</h2>
            <p className="text-gray-300 text-lg max-w-md mx-auto">
              You're about to experience the most comprehensive life optimization system ever built. 
              Let's customize it to fit your unique needs.
            </p>
            <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-cyan-200 text-sm">
                ✨ You're in your <strong>30-day free trial</strong>. No credit card required!
              </p>
            </div>
          </div>
        );

      case 'modules':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Modules</h2>
              <p className="text-gray-300">Select the areas you want to optimize. You can change these anytime.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
              {AVAILABLE_MODULES.map((module) => (
                <label
                  key={module.id}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all
                    ${preferences.enabledModules.includes(module.id)
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={preferences.enabledModules.includes(module.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updatePreferences({
                          enabledModules: [...preferences.enabledModules, module.id]
                        });
                      } else {
                        updatePreferences({
                          enabledModules: preferences.enabledModules.filter(id => id !== module.id)
                        });
                      }
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white">{module.name}</h3>
                      <p className="text-sm text-gray-400">{module.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Theme</h2>
              <p className="text-gray-300">Pick colors that inspire and energize you.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {THEMES.map((theme) => (
                <label
                  key={theme.id}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all
                    ${preferences.theme === theme.id
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                    }
                  `}
                  style={{ backgroundColor: theme.primary + '40' }}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme.id}
                    checked={preferences.theme === theme.id}
                    onChange={(e) => updatePreferences({ 
                      theme: e.target.value,
                      accentColor: theme.accent 
                    })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <h3 className="font-semibold text-white">{theme.name}</h3>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Configure Your AI Coach</h2>
              <p className="text-gray-300">Customize how your AI assistant interacts with you.</p>
            </div>
            
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">AI Personality</h3>
                <div className="space-y-3">
                  {AI_PERSONALITIES.map((personality) => (
                    <label
                      key={personality.id}
                      className={`
                        cursor-pointer p-3 rounded-lg border transition-all flex items-start space-x-3
                        ${preferences.aiPersonality === personality.id
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="aiPersonality"
                        value={personality.id}
                        checked={preferences.aiPersonality === personality.id}
                        onChange={(e) => updatePreferences({ aiPersonality: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <h4 className="font-medium text-white">{personality.name}</h4>
                        <p className="text-sm text-gray-400">{personality.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">AI Proactivity Level</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={preferences.aiProactivity}
                    onChange={(e) => updatePreferences({ aiProactivity: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Passive</span>
                    <span className="text-cyan-400 font-medium">Level {preferences.aiProactivity}</span>
                    <span>Very Proactive</span>
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    {preferences.aiProactivity === 1 && "Only responds when asked"}
                    {preferences.aiProactivity === 2 && "Occasional suggestions"}
                    {preferences.aiProactivity === 3 && "Balanced coaching"}
                    {preferences.aiProactivity === 4 && "Frequent recommendations"}
                    {preferences.aiProactivity === 5 && "Constantly optimizing"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Data</h2>
              <p className="text-gray-300">Connect services for richer insights. You can skip this and add them later.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
              {INTEGRATIONS.map((integration) => (
                <label
                  key={integration.id}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all
                    ${preferences.selectedIntegrations.includes(integration.id)
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={preferences.selectedIntegrations.includes(integration.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updatePreferences({
                          selectedIntegrations: [...preferences.selectedIntegrations, integration.id]
                        });
                      } else {
                        updatePreferences({
                          selectedIntegrations: preferences.selectedIntegrations.filter(id => id !== integration.id)
                        });
                      }
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white">{integration.name}</h3>
                      <p className="text-sm text-gray-400">{integration.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                🔒 All integrations use secure OAuth. We never store your passwords.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-gray-400">
              {Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          
          <button
            onClick={nextStep}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete Setup' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
