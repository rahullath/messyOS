// src/components/auth/AuthLayout.tsx - Layout wrapper with AuthProvider
import React from 'react';
import { AuthProvider } from '../../lib/auth/context';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}