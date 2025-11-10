// src/components/auth/PasswordResetPageContent.tsx - Complete password reset page with provider
import React from 'react';
import { AuthProvider } from '../../lib/auth/context';
import { PasswordResetForm } from './PasswordResetForm';
import { ErrorBoundary } from './ErrorBoundary';

interface PasswordResetPageContentProps {
  mode?: 'request' | 'update';
}

export function PasswordResetPageContent({ mode = 'request' }: PasswordResetPageContentProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PasswordResetForm mode={mode} />
      </AuthProvider>
    </ErrorBoundary>
  );
}