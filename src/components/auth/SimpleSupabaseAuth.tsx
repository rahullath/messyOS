// src/components/auth/SimpleSupabaseAuth.tsx - Pure Supabase authentication (no Privy)
// This is the working auth system that was mentioned in the agent file

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';

export default function SimpleSupabaseAuth() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(false);
        
        // Ensure user profile exists in database
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            console.log('👤 Creating user profile...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || '',
                avatar_url: session.user.user_metadata?.avatar_url || '',
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error('❌ Failed to create profile:', insertError);
            } else {
              console.log('✅ User profile created');
            }
          }
        } catch (profileError) {
          console.error('❌ Profile check error:', profileError);
        }
        
        // Redirect to dashboard on successful login
        console.log('🔄 Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Existing session found:', session.user.email);
        setUser(session.user);
        // Don't redirect here, let the auth state change handler do it
      } else {
        console.log('🚫 No existing session');
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log('🚀 Starting Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // Use callback page
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        alert('Google login failed: ' + error.message);
      }
    } catch (error) {
      console.error('❌ Google OAuth exception:', error);
      alert('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    alert('Email login will be implemented next. For now, please use Google login.');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
      } else {
        console.log('👋 Logged out successfully');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Logout exception:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show welcome message
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
            <p className="text-gray-300">{user.email}</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">meshOS</h1>
          <p className="text-gray-300">Your AI-powered operating system</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={handleEmailLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            <span>Continue with Email</span>
          </button>
        </div>

        <div className="mt-8 p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-500/30">
          <div className="text-center">
            <h3 className="text-cyan-300 font-semibold mb-2">🎁 Free Trial Included</h3>
            <p className="text-cyan-200 text-sm">
              Get <strong>5,000 tokens</strong> (₹500 value) to explore all meshOS features
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6">
          <p>
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}