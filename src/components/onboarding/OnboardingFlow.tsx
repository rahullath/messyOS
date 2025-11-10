import React, { useState } from 'react';
import ProfileForm, { type ProfileFormData } from './ProfileForm';

type OnboardingStep = 'welcome' | 'profile' | 'complete';

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWelcomeNext = () => {
    setCurrentStep('profile');
  };

  const handleProfileSubmit = async (profileData: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Submit profile data to complete onboarding
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: profileData,
          preferences: {
            enabledModules: profileData.preferredModules,
            theme: 'dark',
            accentColor: '#06b6d4',
            aiPersonality: 'professional',
            aiProactivity: 3,
            selectedIntegrations: []
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep('complete');
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = '/tasks';
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to complete onboarding');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStart = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Quick start with minimal setup
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep('complete');
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = '/tasks';
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to complete onboarding');
      }
    } catch (err) {
      console.error('Quick start error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {currentStep === 'welcome' && (
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to <span className="text-cyan-400">Messy</span>OS! 🎉
            </h1>
            <p className="text-xl text-gray-300">
              Your AI-powered life optimization system is ready
            </p>
          </div>

          {/* Free Trial Banner */}
          <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-400/30 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-cyan-300 mb-2">🎁 Free Trial Activated!</h2>
            <p className="text-cyan-100 text-lg mb-4">
              You've received <strong>5,000 tokens</strong> (₹500 value) to explore all MessyOS features
            </p>
            <div className="bg-cyan-900/20 rounded-lg p-4">
              <p className="text-cyan-200">
                <strong>Your trial expires in 30 days</strong><br />
                Use your tokens to try AI workflows, integrations, and automation
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">📋 Task Management</h3>
              <p className="text-gray-300 text-sm">
                Organize your work and personal tasks with intelligent prioritization
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">🎯 Habit Tracking</h3>
              <p className="text-gray-300 text-sm">
                Build positive habits and track your progress over time
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">💰 Finance Tracking</h3>
              <p className="text-gray-300 text-sm">
                Monitor expenses, investments, and financial goals
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">❤️ Health Monitoring</h3>
              <p className="text-gray-300 text-sm">
                Track fitness, sleep, nutrition, and wellness metrics
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleWelcomeNext}
              disabled={isLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Customize My Experience →
            </button>
            
            <button
              onClick={handleQuickStart}
              disabled={isLoading}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting up...' : 'Quick Start (Skip Setup)'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Support */}
          <div className="text-center text-sm text-gray-400">
            <p>Need help getting started?</p>
            <a href="/help" className="text-cyan-400 hover:text-cyan-300 underline">
              View Help Center
            </a>
          </div>
        </div>
      )}

      {currentStep === 'profile' && (
        <ProfileForm
          onSubmit={handleProfileSubmit}
          onBack={() => setCurrentStep('welcome')}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'complete' && (
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to MessyOS!
            </h1>
            <p className="text-xl text-gray-300">
              Your account is set up and ready to go
            </p>
          </div>

          <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-green-300 mb-2">✅ Setup Complete!</h2>
            <p className="text-green-100 text-lg">
              Redirecting you to your tasks dashboard...
            </p>
          </div>

          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      )}

      {error && currentStep !== 'welcome' && (
        <div className="max-w-2xl mx-auto mt-6">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-200 text-center">{error}</p>
            <div className="text-center mt-4">
              <button
                onClick={() => setError(null)}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}