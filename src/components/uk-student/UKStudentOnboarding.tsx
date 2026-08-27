// UK Student Onboarding Flow - Multi-step setup wizard
import React, { useState } from 'react';
import { userInitService } from '../../lib/uk-student/user-initialization';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'location' | 'budget' | 'transport' | 'dietary' | 'complete';

interface OnboardingData {
  homeLocation: 'five-ways' | 'selly-oak' | 'edgbaston';
  weeklyBudget: number;
  transportPreference: 'bike' | 'train' | 'mixed';
  dietaryRestrictions: string[];
  cookingTimeLimits: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

export const UKStudentOnboarding: React.FC<OnboardingProps> = ({ userId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    homeLocation: 'five-ways',
    weeklyBudget: 200,
    transportPreference: 'mixed',
    dietaryRestrictions: [],
    cookingTimeLimits: {
      breakfast: 10,
      lunch: 20,
      dinner: 30
    }
  });

  const handleNext = async () => {
    const steps: Step[] = ['welcome', 'location', 'budget', 'transport', 'dietary', 'complete'];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }

    // If moving to complete step, initialize user
    if (steps[currentIndex + 1] === 'complete') {
      await initializeUser();
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['welcome', 'location', 'budget', 'transport', 'dietary', 'complete'];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const initializeUser = async () => {
    setLoading(true);
    try {
      await userInitService.initializeUser({
        userId,
        homeLocation: data.homeLocation,
        transportPreference: data.transportPreference,
        weeklyBudget: data.weeklyBudget
      });
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const getStepNumber = () => {
    const steps: Step[] = ['welcome', 'location', 'budget', 'transport', 'dietary', 'complete'];
    return steps.indexOf(currentStep);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="bg-gray-100 h-2">
            <div
              className="bg-blue-600 h-2 transition-all duration-300"
              style={{ width: `${(getStepNumber() / 5) * 100}%` }}
            />
          </div>
        )}

        <div className="p-8">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="text-7xl mb-6">🎓</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to UK Student Life
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Let's set up your Birmingham student life optimizer in just 2 minutes
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">What we'll set up:</h3>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-medium text-gray-900">Your Location</div>
                      <div className="text-sm text-gray-600">Home area in Birmingham</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <div className="font-medium text-gray-900">Budget</div>
                      <div className="text-sm text-gray-600">Weekly spending limits</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🚴</span>
                    <div>
                      <div className="font-medium text-gray-900">Transport</div>
                      <div className="text-sm text-gray-600">Bike or train preferences</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <div className="font-medium text-gray-900">Food</div>
                      <div className="text-sm text-gray-600">Dietary preferences</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors w-full"
              >
                Let's Get Started →
              </button>
            </div>
          )}

          {/* Location Step */}
          {currentStep === 'location' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Where do you live?</h2>
              <p className="text-gray-600 mb-8">This helps us optimize travel routes and store recommendations</p>

              <div className="space-y-4">
                {[
                  { value: 'five-ways', label: 'Five Ways', desc: '~25 min bike to campus, £2.05 train' },
                  { value: 'selly-oak', label: 'Selly Oak', desc: '~15 min bike to campus, £2.05 train' },
                  { value: 'edgbaston', label: 'Edgbaston', desc: 'Close to campus, walking distance' }
                ].map(location => (
                  <button
                    key={location.value}
                    onClick={() => updateData({ homeLocation: location.value as any })}
                    className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                      data.homeLocation === location.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-lg text-gray-900">{location.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{location.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Budget Step */}
          {currentStep === 'budget' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">What's your weekly budget?</h2>
              <p className="text-gray-600 mb-8">We'll help you track spending and stay on track</p>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-600 mb-2">Weekly Budget</div>
                  <div className="text-5xl font-bold text-gray-900">£{data.weeklyBudget}</div>
                  <div className="text-sm text-gray-600 mt-2">≈ £{(data.weeklyBudget * 4.33).toFixed(0)}/month</div>
                </div>

                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={data.weeklyBudget}
                  onChange={(e) => updateData({ weeklyBudget: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>£50</span>
                  <span>£500</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="text-sm font-medium text-blue-900 mb-2">We'll allocate:</div>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>🛒 Groceries: £{(data.weeklyBudget * 0.4).toFixed(0)} (40%)</div>
                  <div>🚆 Transport: £{(data.weeklyBudget * 0.15).toFixed(0)} (15%)</div>
                  <div>🎮 Entertainment: £{(data.weeklyBudget * 0.25).toFixed(0)} (25%)</div>
                  <div>🧴 Personal Care: £{(data.weeklyBudget * 0.1).toFixed(0)} (10%)</div>
                  <div>📦 Misc: £{(data.weeklyBudget * 0.1).toFixed(0)} (10%)</div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Transport Step */}
          {currentStep === 'transport' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">How do you get around?</h2>
              <p className="text-gray-600 mb-8">We'll give you weather-aware travel recommendations</p>

              <div className="space-y-4">
                {[
                  { value: 'bike', icon: '🚴', label: 'Mostly Bike', desc: 'I prefer cycling when weather is good' },
                  { value: 'train', icon: '🚆', label: 'Mostly Train', desc: 'I take the train most days (£2.05-2.10/day)' },
                  { value: 'mixed', icon: '🔄', label: 'Mixed', desc: 'Bike when sunny, train when rainy' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateData({ transportPreference: option.value as any })}
                    className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                      data.transportPreference === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">{option.icon}</span>
                      <div>
                        <div className="font-semibold text-lg text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Dietary Step */}
          {currentStep === 'dietary' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Any dietary preferences?</h2>
              <p className="text-gray-600 mb-8">We'll suggest recipes that match your diet (you can skip this)</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Vegetarian', 'Vegan', 'Halal', 'No Dairy', 'No Gluten', 'No Nuts'].map(restriction => (
                  <button
                    key={restriction}
                    onClick={() => {
                      const current = data.dietaryRestrictions;
                      const updated = current.includes(restriction)
                        ? current.filter(r => r !== restriction)
                        : [...current, restriction];
                      updateData({ dietaryRestrictions: updated });
                    }}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      data.dietaryRestrictions.includes(restriction)
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {restriction}
                  </button>
                ))}
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-900">
                  💡 You can always update these preferences later in settings
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Finish Setup →'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="text-7xl mb-6">🎉</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">You're all set!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your UK Student dashboard is ready to help you optimize your Birmingham life
              </p>

              <div className="bg-green-50 rounded-xl p-6 mb-8">
                <div className="text-sm font-medium text-green-900 mb-3">What's next:</div>
                <div className="space-y-2 text-left text-sm text-green-800">
                  <div>✅ Budget categories created</div>
                  <div>✅ Default routines added (morning, skincare, laundry)</div>
                  <div>✅ Birmingham stores and locations loaded</div>
                  <div>✅ Transport preferences saved</div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors w-full"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
