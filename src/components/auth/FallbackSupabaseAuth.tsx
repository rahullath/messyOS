// Fallback to Supabase Auth since Privy has wallet issues
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export const FallbackSupabaseAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email for the login link!');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-4">Sign In to meshOS</h3>
        <p className="text-gray-300 mb-6 text-sm">
          Email authentication via Supabase (Privy fallback)
        </p>
        
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
        
        <div className="mt-4 text-xs text-gray-400">
          <p>• Email magic link authentication</p>
          <p>• No wallet setup required</p>
          <p>• Uses existing Supabase backend</p>
        </div>
      </div>
    </div>
  );
};

export default FallbackSupabaseAuth;