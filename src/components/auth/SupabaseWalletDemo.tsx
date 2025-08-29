// src/components/auth/SupabaseWalletDemo.tsx - Complete demo of Supabase auth with simulated wallet
import { useState, useEffect } from 'react';
import { authService } from '../../lib/auth/supabase-auth';
import { tokenDeductionService } from '../../lib/services/token-deduction';
import { SimulatedWallet } from '../wallet/SimulatedWallet';
import type { User } from '../../lib/auth/supabase-auth';
import { supabase } from '../../lib/supabase/client';

export function SupabaseWalletDemo() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAction, setDemoAction] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleDemoAction = async (actionType: string) => {
    if (!user) return;
    
    setDemoAction(actionType);
    
    try {
      let success = false;
      
      switch (actionType) {
        case 'ai_query':
          success = await tokenDeductionService.deductForAIQuery(
            user.id, 
            'Demo AI Query',
            { demo: true, query: 'What is the weather today?' }
          );
          break;
        case 'document_gen':
          success = await tokenDeductionService.deductForDocumentGeneration(
            user.id,
            'Demo Document',
            { demo: true, document_type: 'report' }
          );
          break;
        case 'data_analysis':
          success = await tokenDeductionService.deductForDataAnalysis(
            user.id,
            'Demo Analysis',
            { demo: true, analysis_type: 'trend_analysis' }
          );
          break;
        case 'daily_bonus':
          success = await tokenDeductionService.awardDailyBonus(user.id);
          break;
        case 'integration_bonus':
          success = await tokenDeductionService.awardIntegrationBonus(user.id, 'github');
          break;
      }
      
      if (success) {
        alert(`${actionType.replace('_', ' ')} completed successfully!`);
        // Refresh user data to show updated balance
        await loadUser();
      } else {
        alert(`Failed to complete ${actionType.replace('_', ' ')}. Check your balance or try again.`);
      }
    } catch (error) {
      console.error('Error performing demo action:', error);
      alert('An error occurred while performing the action.');
    } finally {
      setDemoAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meshOS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">meshOS</h1>
            <p className="text-gray-600">Supabase Authentication + Simulated Web3 Wallet</p>
          </div>
        </div>
        
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <SignInForm onSuccess={loadUser} />
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">What you'll get:</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900">Secure Authentication</h4>
                <p className="text-sm text-gray-500 mt-1">Pure Supabase auth with OAuth support</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900">₹500 Starting Credit</h4>
                <p className="text-sm text-gray-500 mt-1">Free tokens to explore AI features</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900">Simulated Wallet</h4>
                <p className="text-sm text-gray-500 mt-1">Web3-like experience without complexity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">meshOS Dashboard</h1>
          <p className="text-gray-600 mt-2">Supabase Authentication + Simulated Web3 Experience</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl font-bold">
                    {user.profile.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.profile.full_name || 'User'}
                </h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Joined {new Date(user.session.user.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => authService.signOut()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            </div>

            {/* Demo Actions Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleDemoAction('ai_query')}
                  disabled={demoAction === 'ai_query'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {demoAction === 'ai_query' ? 'Processing...' : 'AI Query (₹1.00)'}
                </button>
                
                <button
                  onClick={() => handleDemoAction('document_gen')}
                  disabled={demoAction === 'document_gen'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {demoAction === 'document_gen' ? 'Processing...' : 'Generate Document (₹5.00)'}
                </button>
                
                <button
                  onClick={() => handleDemoAction('data_analysis')}
                  disabled={demoAction === 'data_analysis'}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {demoAction === 'data_analysis' ? 'Processing...' : 'Data Analysis (₹3.00)'}
                </button>
                
                <div className="border-t pt-3 mt-3">
                  <button
                    onClick={() => handleDemoAction('daily_bonus')}
                    disabled={demoAction === 'daily_bonus'}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {demoAction === 'daily_bonus' ? 'Processing...' : 'Daily Bonus (+₹10.00)'}
                  </button>
                  
                  <button
                    onClick={() => handleDemoAction('integration_bonus')}
                    disabled={demoAction === 'integration_bonus'}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 mt-2"
                  >
                    {demoAction === 'integration_bonus' ? 'Processing...' : 'Integration Bonus (+₹50.00)'}
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                These buttons demonstrate the token deduction and reward system in action.
              </p>
            </div>
          </div>

          {/* Simulated Wallet */}
          <div className="lg:col-span-2">
            <SimulatedWallet 
              userId={user.id}
              walletAddress={user.profile.simulated_wallet_address}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sign in form component
function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user;
      if (isSignUp) {
        user = await authService.signUpWithEmail(email, password, fullName);
      } else {
        user = await authService.signInWithEmail(email, password);
      }

      if (user) {
        onSuccess();
      } else {
        setError(`Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please check your credentials.`);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(`${isSignUp ? 'Sign up' : 'Sign in'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const result = await authService.signInWithOAuth(provider);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuth('google')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            GitHub
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}