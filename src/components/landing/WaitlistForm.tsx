// src/components/landing/WaitlistForm.tsx - Waitlist signup form with analytics
import React, { useState } from 'react';
import { LoadingButton } from '../ui/LoadingStates';
import { analytics } from '../../lib/analytics/tracking';
import { waitlistService, type WaitlistResponse } from '../../lib/waitlist/service';

interface WaitlistFormProps {
  onSuccess: (response: WaitlistResponse) => void;
  onError: (error: string) => void;
}

export function WaitlistForm({ onSuccess, onError }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Track waitlist attempt
      analytics.trackEngagement('waitlist_attempt', 'email_form');
      
      const response = await waitlistService.addToWaitlist({
        email: email.trim(),
        referrer: document.referrer || undefined,
        interestArea: 'general'
      });

      // Track successful signup
      analytics.trackWaitlistSignup(email, document.referrer || 'direct');
      
      onSuccess(response);
      setEmail(''); // Clear form on success
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join waitlist';
      
      // Track error
      analytics.trackWaitlistError(errorMessage);
      
      onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="waitlist-form">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email for early access"
            className={`w-full px-4 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors min-h-[44px] ${
              emailError ? 'border-red-500' : 'border-slate-600'
            }`}
            disabled={isSubmitting}
            required
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-400">{emailError}</p>
          )}
        </div>
        
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingText="Joining..."
          disabled={isSubmitting || !email.trim()}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Join Waitlist
        </LoadingButton>
      </div>
      
      <p className="mt-3 text-xs text-gray-400 text-center">
        Get notified when MessyOS launches. No spam, unsubscribe anytime.
      </p>
    </form>
  );
}