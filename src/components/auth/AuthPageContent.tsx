// src/components/auth/AuthPageContent.tsx - Complete auth page with provider
import React from 'react';
import { AuthProvider } from '../../lib/auth/context';
import { AuthForm } from './AuthForm';

interface AuthPageContentProps {
  redirectTo?: string;
}

export function AuthPageContent({ redirectTo = '/dashboard' }: AuthPageContentProps) {
  return (
    <AuthProvider>
      <AuthForm redirectTo={redirectTo} />
    </AuthProvider>
  );
}