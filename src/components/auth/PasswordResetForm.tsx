// src/components/auth/PasswordResetForm.tsx - Enhanced password reset form component
import React, { useState } from 'react';
import { authClient } from '../../lib/auth/config';
import { validateEmail } from '../../lib/auth/validation';
import { mapSupabaseError } from '../../lib/auth/errors';
import { withNetworkAwareRetry } from '../../lib/auth/retry';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { SuccessMessage } from './SuccessMessage';

interface PasswordResetFormProps {
  mode?: 'request' | 'update';
}

export function PasswordResetForm({ mode = 'request' }: PasswordResetFormProps) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setError({ message: emailError });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await withNetworkAwareRetry(
        async () => {
          const { error } = await authClient.auth.resetPasswordForEmail(email, {
            redirectTo: typeof window !== 'undefined' 
              ? `${window.location.origin}/reset-password?mode=update`
              : import.meta.env.PROD 
                ? 'https://messy-os.vercel.app/reset-password?mode=update'
                : 'http://localhost:4321/reset-password?mode=update'
          });

          if (error) {
            throw mapSupabaseError(error);
          }
        },
        (networkError) => {
          console.warn('Network error during password reset request, retrying...', networkError);
          setRetryCount(prev => prev + 1);
        }
      );

      setSuccess('Password reset email sent! Check your inbox and spam folder for further instructions.');
      setRetryCount(0);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!newPassword) {
      setError({ message: 'New password is required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setError({ message: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setError({ message: 'Password must be at least 8 characters long' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await withNetworkAwareRetry(
        async () => {
          const { error } = await authClient.auth.updateUser({
            password: newPassword
          });

          if (error) {
            throw mapSupabaseError(error);
          }
        },
        (networkError) => {
          console.warn('Network error during password update, retrying...', networkError);
          setRetryCount(prev => prev + 1);
        }
      );

      setSuccess('Password updated successfully! You can now sign in with your new password.');
      setRetryCount(0);
      
      // Redirect to login after successful password update
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Password update error:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (mode === 'request') {
      await handlePasswordResetRequest(new Event('submit') as any);
    } else {
      await handlePasswordUpdate(new Event('submit') as any);
    }
  };

  if (mode === 'update') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Update Password</h2>
          <p className="text-gray-400">
            Enter your new password below.
          </p>
        </div>

        {success && <SuccessMessage message={success} />}
        {error && (
          <ErrorMessage 
            message={error.message || 'Failed to update password'} 
            error={error}
            onRetry={handleRetry}
            showSuggestions={true}
          />
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
              placeholder="Enter new password"
              disabled={isLoading}
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
              placeholder="Confirm new password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Updating...</span>
              </div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/login" 
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-gray-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {success && <SuccessMessage message={success} />}
      {error && (
        <ErrorMessage 
          message={error.message || 'Failed to send password reset email'} 
          error={error}
          onRetry={handleRetry}
          showSuggestions={true}
        />
      )}

      <form onSubmit={handlePasswordResetRequest} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
            placeholder="Enter your email"
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Sending{retryCount > 0 && ` (Attempt ${retryCount + 1})`}...</span>
            </div>
          ) : (
            'Send Reset Email'
          )}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <a 
          href="/login" 
          className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          ← Back to Sign In
        </a>
        <p className="text-xs text-gray-500">
          Didn't receive the email? Check your spam folder or try again in a few minutes.
        </p>
      </div>
    </div>
  );
}