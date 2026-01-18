'use client';

import { useAuth } from '@/features/auth/hooks';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Pharmacy role types that can be checked
type PharmacyRoleType = 'PHARMACY_OWNER' | 'SUPERINTENDENT_PHARMACIST' | 'SUPERVISING_PHARMACIST' | 'STAFF';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: (PharmacyRoleType | 'ADMIN')[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard - Protects pages based on pharmacy role type
 * 
 * For pharmacy users, checks roleType from pharmacy context (e.g., PHARMACY_OWNER, SUPERINTENDENT_PHARMACIST)
 * For admin users, checks user.role directly (ADMIN)
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { roleType, isLoaded: contextLoaded } = usePharmacyContext();
  const router = useRouter();

  // Determine if user is admin (system role)
  const isAdmin = user?.role === 'ADMIN';
  
  // For pharmacy users, use roleType from context; for admins, use 'ADMIN'
  const effectiveRole = isAdmin ? 'ADMIN' : roleType;
  
  // Still loading - show spinner
  const isLoading = authLoading || (!isAdmin && !contextLoaded);

  useEffect(() => {
    // Wait until loading is complete
    if (isLoading || !user) return;
    
    // Check if user has permission
    if (effectiveRole && !allowedRoles.includes(effectiveRole as PharmacyRoleType | 'ADMIN')) {
      // Redirect to dashboard if user doesn't have permission
      router.push('/dashboard');
    }
  }, [user, isLoading, effectiveRole, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check permission based on effective role
  if (!effectiveRole || !allowedRoles.includes(effectiveRole as PharmacyRoleType | 'ADMIN')) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
