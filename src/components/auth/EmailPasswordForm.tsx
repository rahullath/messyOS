// src/components/auth/EmailPasswordForm.tsx - Email/password authentication form with validation
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/context';
import { validateEmail, validatePassword, getPasswordStrength } from '../../lib/auth/validation';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { LoadingSpinner } from './LoadingSpinner';

interface EmailPasswordFormProps {
  mode: 'signin' | 'signup';
  onSuccess: (message?: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
}

export function EmailPasswordForm({ mode, onSuccess, onError, disabled }: EmailPasswordFormProps) {
  const { signInWithEmail, signUpWithEmail, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Sign up specific validations
    if (mode === 'signup') {
      // Full name validation
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      } else if (formData.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name must be at least 2 characters';
      }

      // Confirm password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      // Password strength validation for signup
      if (passwordStrength.score < 3) {
        newErrors.password = 'Please choose a stronger password';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const user = await signInWithEmail(formData.email, formData.password);
        if (user) {
          onSuccess('Welcome back! Redirecting to your dashboard...');
        } else {
          onError('Invalid email or password. Please try again.');
        }
      } else {
        const user = await signUpWithEmail(
          formData.email, 
          formData.password, 
          formData.fullName.trim()
        );
        if (user) {
          onSuccess('Account created successfully! Welcome to MessyOS!');
        } else {
          onError('Account creation failed. Please check your email for verification.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Import error handling utilities
      const { mapSupabaseError } = await import('../../lib/auth/errors');
      const authError = mapSupabaseError(error);
      
      onError(authError.userMessage || authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = disabled || isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      {/* Full Name (Sign up only) */}
      {mode === 'signup' && (
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className={`w-full px-3 py-3 sm:py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors text-base sm:text-sm min-h-[44px] ${
              errors.fullName ? 'border-red-500' : 'border-slate-600'
            }`}
            placeholder="Enter your full name"
            disabled={isFormDisabled}
            autoComplete="name"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
          )}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-3 py-3 sm:py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors text-base sm:text-sm min-h-[44px] ${
            errors.email ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="Enter your email"
          disabled={isFormDisabled}
          autoComplete="email"
          inputMode="email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-3 sm:py-2 pr-12 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors text-base sm:text-sm min-h-[44px] ${
              errors.password ? 'border-red-500' : 'border-slate-600'
            }`}
            placeholder="Enter your password"
            disabled={isFormDisabled}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white min-w-[44px] min-h-[44px] justify-center"
            disabled={isFormDisabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password}</p>
        )}
        
        {/* Password Strength Indicator (Sign up only) */}
        {mode === 'signup' && formData.password && (
          <PasswordStrengthIndicator strength={passwordStrength} />
        )}
      </div>

      {/* Confirm Password (Sign up only) */}
      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`w-full px-3 py-3 sm:py-2 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors text-base sm:text-sm min-h-[44px] ${
              errors.confirmPassword ? 'border-red-500' : 'border-slate-600'
            }`}
            placeholder="Confirm your password"
            disabled={isFormDisabled}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isFormDisabled}
        className="w-full px-4 py-3 sm:py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base sm:text-sm min-h-[44px] flex items-center justify-center"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2">
              {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
            </span>
          </div>
        ) : (
          mode === 'signin' ? 'Sign In' : 'Create Account'
        )}
      </button>
    </form>
  );
}