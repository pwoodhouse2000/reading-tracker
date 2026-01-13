'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Component to conditionally render content only for authenticated users
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Don't show anything while loading to prevent flicker
  if (isLoading) {
    return null;
  }
  
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
