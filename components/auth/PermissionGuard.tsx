'use client';

/**
 * PermissionGuard Component
 * Protects UI elements based on user permissions and pharmacy governance status
 */

import { ReactNode } from 'react';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { checkPermission } from '@/lib/permissions';
import type { Permissions } from '@/lib/permissions';
import type { PharmacyRoleType } from '@/features/onboarding/types';

interface PermissionGuardProps {
  children: ReactNode;
  /** Permission check: { category: 'orders', action: 'view' } */
  permission?: { category: keyof Permissions; action: string };
  /** Multiple permissions with OR logic */
  anyPermission?: Array<{ category: keyof Permissions; action: string }>;
  /** Required role types */
  roleTypes?: PharmacyRoleType[];
  /** Require pharmacy to be fully active to show content */
  requireActive?: boolean;
  /** Fallback content when access is denied */
  fallback?: ReactNode;
  /** Show nothing when access is denied (default: null) */
  hideOnDenied?: boolean;
}

/**
 * Guard component that shows children only when permission requirements are met
 *
 * @example
 * // Single permission check
 * <PermissionGuard permission={{ category: 'financials', action: 'view' }}>
 *   <FinancialsDashboard />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (OR logic)
 * <PermissionGuard anyPermission={[
 *   { category: 'orders', action: 'update' },
 *   { category: 'staff', action: 'manage' }
 * ]}>
 *   <ActionButton />
 * </PermissionGuard>
 *
 * @example
 * // Role-based guard
 * <PermissionGuard roleTypes={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * @example
 * // Require active pharmacy
 * <PermissionGuard requireActive fallback={<PendingActivation />}>
 *   <OrderManager />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  anyPermission,
  roleTypes,
  requireActive = false,
  fallback = null,
  hideOnDenied = true,
}: PermissionGuardProps) {
  const { permissions, roleType, canOperate, isLoaded } = usePharmacyContext();

  // #region agent log
  if (typeof window !== 'undefined') {
    // Agent logging removed
  }
  // #endregion
  return hideOnDenied ? null : <>{fallback}</>;

  // Check active pharmacy requirement
  if (requireActive && !canOperate) {
    // #region agent log
    if (typeof window !== 'undefined') {
      // Agent logging removed
    }
    // #endregion
    return hideOnDenied ? null : <>{fallback}</>;
  }

  // Check single permission
  if (permission) {
    if (!permissions) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
    if (!checkPermission(permissions, permission.category, permission.action)) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
  }

  // Check any permission (OR logic)
  if (anyPermission && anyPermission.length > 0) {
    if (!permissions) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
    const hasAny = anyPermission.some(({ category, action }) =>
      checkPermission(permissions, category, action)
    );
    if (!hasAny) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Hook-style guard for programmatic permission checks
 */
export function usePermissionCheck(
  permission?: { category: keyof Permissions; action: string },
  roleTypes?: PharmacyRoleType[],
  requireActive?: boolean
): boolean {
  const { permissions, roleType, canOperate, isLoaded } = usePharmacyContext();

  if (!isLoaded) return false;

  if (requireActive && !canOperate) return false;

  if (roleTypes && roleTypes.length > 0) {
    if (!roleType || !roleTypes.includes(roleType)) return false;
  }

  if (permission) {
    if (!checkPermission(permissions, permission.category, permission.action)) return false;
  }

  return true;
}

/**
 * Component that shows access denied message
 */
export function AccessDenied({
  title = 'Access Denied',
  description = "You don't have permission to view this content.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

/**
 * Component that shows pending activation message
 */
export function PendingActivation({
  status,
}: {
  status?: string;
}) {
  const getStatusMessage = () => {
    switch (status) {
      case 'INCOMPLETE':
        return 'Missing required setup: Add a Superintendent Pharmacist and create locations to complete activation.';
      case 'SUSPENDED':
        return 'Your pharmacy has been suspended. Please contact support.';
      default:
        return 'Your pharmacy is pending activation.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <div className="rounded-full bg-amber-100 p-4 mb-4">
        <svg
          className="h-8 w-8 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Pharmacy Pending Activation</h3>
      <p className="text-sm text-muted-foreground max-w-md">{getStatusMessage()}</p>
    </div>
  );
}
