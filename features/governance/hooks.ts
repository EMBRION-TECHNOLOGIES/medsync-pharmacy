/**
 * Pharmacy Governance Hooks
 * Provides hooks for loading and checking pharmacy context, roles, and permissions
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useOrg } from '@/store/useOrg';
import { checkPermission, getDefaultPermissions, canPharmacyOperate } from '@/lib/permissions';
import type { Permissions } from '@/lib/permissions';
import type { PharmacyRoleType, GovernanceStatus } from '@/features/onboarding/types';

// Approval mode type (mirrors backend)
type ApprovalMode = 'PRODUCTION' | 'TEST';

// Operational status from backend (single source of truth)
interface OperationalStatus {
  canOperate: boolean;
  governanceStatus: GovernanceStatus;
  adminApproved: boolean;
  approvalMode: ApprovalMode;
  isTestMode: boolean;
  reasons: string[];
  requirements: {
    hasSuperintendent: boolean;
    superintendentCount: number;
    hasLocations: boolean;
    locationCount: number;
  };
}

// API response types
interface PharmacyContextResponse {
  pharmacyId: string;
  pharmacyName: string;
  roleType: PharmacyRoleType;
  roleDisplayName: string;
  permissions: Permissions;
  governanceStatus: GovernanceStatus;
  canOperate: boolean;
  approvalMode: ApprovalMode;
  isTestMode: boolean;
}

/**
 * Fetch pharmacy context from backend
 *
 * IMPORTANT: Uses the backend's operationalStatus.canOperate as the single source of truth.
 * This ensures consistency between frontend UI and backend API enforcement.
 */
async function fetchPharmacyContext(pharmacyId: string): Promise<PharmacyContextResponse> {
  // Get context from pharmacy profile endpoint
  try {
    const response = await api.get(`/pharmacy-management/my-pharmacy`);
    // API interceptor unwraps response.data.data to response.data
    const profileResponse = response.data as {
      pharmacy?: {
        id: string;
        name: string;
        governanceStatus?: GovernanceStatus;
        approvalMode?: ApprovalMode;
      };
      pharmacyUser?: {
        roleType?: PharmacyRoleType;
        permissions?: Permissions;
      };
      // Authoritative operational status from pharmacyOperationalService
      operationalStatus?: OperationalStatus;
      // Legacy field for backward compatibility
      role?: string;
    };

    // Extract pharmacy data from response
    const pharmacy = profileResponse.pharmacy;
    if (!pharmacy) {
      throw new Error('No pharmacy found in profile');
    }

    // Build context from profile data
    // Map roleType from pharmacyUser.roleType or legacy role field
    let roleType: PharmacyRoleType = profileResponse.pharmacyUser?.roleType || 'STAFF';
    if (roleType === 'STAFF' && profileResponse.role) {
      // Map legacy role to roleType
      if (profileResponse.role === 'PHARMACY_OWNER') {
        roleType = 'PHARMACY_OWNER';
      } else if (profileResponse.role === 'PHARMACIST') {
        // Legacy PHARMACIST could be SUPERINTENDENT or SUPERVISING - default to STAFF for safety
        roleType = 'STAFF';
      }
    }
    // ALWAYS derive permissions from roleType using frontend config
    // Backend permissions may be incomplete/stale - frontend is source of truth for UI permissions
    const permissions = getDefaultPermissions(roleType);

    // Use operationalStatus from backend as single source of truth
    // This includes the test mode bypass logic (AC-TEST-02)
    const operationalStatus = profileResponse.operationalStatus;
    const governanceStatus = operationalStatus?.governanceStatus || pharmacy.governanceStatus || 'INCOMPLETE';
    const approvalMode = operationalStatus?.approvalMode || pharmacy.approvalMode || 'PRODUCTION';
    const isTestMode = operationalStatus?.isTestMode || approvalMode === 'TEST';

    // CRITICAL: Use backend's canOperate instead of calculating locally
    // This ensures UI matches backend enforcement
    const canOperate = operationalStatus?.canOperate ?? canPharmacyOperate(governanceStatus);

    const contextData: PharmacyContextResponse = {
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      roleType,
      roleDisplayName: getRoleDisplayName(roleType),
      permissions,
      governanceStatus,
      canOperate,
      approvalMode,
      isTestMode,
    };

    return contextData;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _apiError = error as { message?: string; response?: { status?: number } };
    // If endpoint fails, return a minimal context with default values
    console.warn('Failed to fetch pharmacy context, using defaults');
    return {
      pharmacyId,
      pharmacyName: 'Unknown Pharmacy',
      roleType: 'STAFF',
      roleDisplayName: 'Staff',
      permissions: getDefaultPermissions('STAFF'),
      governanceStatus: 'INCOMPLETE',
      canOperate: false,
      approvalMode: 'PRODUCTION',
      isTestMode: false,
    };
  }
}

/**
 * Get display name for role type
 */
function getRoleDisplayName(roleType: PharmacyRoleType): string {
  const names: Record<PharmacyRoleType, string> = {
    PHARMACY_OWNER: 'Pharmacy Owner',
    SUPERINTENDENT_PHARMACIST: 'Superintendent Pharmacist',
    SUPERVISING_PHARMACIST: 'Supervising Pharmacist',
    STAFF: 'Staff',
  };
  return names[roleType] || 'Staff';
}

/**
 * Hook to load pharmacy context
 * Call this in the protected layout to initialize the governance context
 */
export function useLoadPharmacyContext(options: { enabled?: boolean } = {}) {
  const { pharmacyId } = useOrg();
  const { setContext, clearContext, isLoaded } = usePharmacyContext();

  const queryEnabled = !!pharmacyId && options.enabled !== false;

  const query = useQuery({
    queryKey: ['pharmacy-context', pharmacyId],
    queryFn: () => fetchPharmacyContext(pharmacyId!),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Update store when data loads
  useEffect(() => {
    if (query.data) {
      setContext({
        pharmacyId: query.data.pharmacyId,
        pharmacyName: query.data.pharmacyName,
        roleType: query.data.roleType,
        roleDisplayName: query.data.roleDisplayName,
        permissions: query.data.permissions,
        governanceStatus: query.data.governanceStatus,
        canOperate: query.data.canOperate,
        approvalMode: query.data.approvalMode,
        isTestMode: query.data.isTestMode,
      });
    }
  }, [query.data, setContext]);

  // Clear on error or when pharmacy changes
  useEffect(() => {
    if (query.error) {
      clearContext();
    }
  }, [query.error, clearContext]);

  return {
    ...query,
    isContextLoaded: isLoaded,
  };
}

/**
 * Hook to check a specific permission
 */
export function usePermission(category: keyof Permissions, action: string): boolean {
  const { permissions } = usePharmacyContext();
  return checkPermission(permissions, category, action);
}

/**
 * Hook to check multiple permissions (OR logic)
 */
export function useAnyPermission(
  checks: Array<{ category: keyof Permissions; action: string }>
): boolean {
  const { permissions } = usePharmacyContext();
  return checks.some(({ category, action }) => checkPermission(permissions, category, action));
}

/**
 * Hook to check if user has one of the specified role types
 */
export function useHasRoleType(roleTypes: PharmacyRoleType[]): boolean {
  const { roleType } = usePharmacyContext();
  return roleType !== null && roleTypes.includes(roleType);
}

/**
 * Hook to check if pharmacy can operate (is active)
 */
export function useCanOperate(): boolean {
  const { canOperate, governanceStatus } = usePharmacyContext();
  // Also check governanceStatus directly in case canOperate isn't set
  return canOperate || governanceStatus === 'ACTIVE';
}

/**
 * Hook to get governance status with display info
 */
export function useGovernanceStatus() {
  const { governanceStatus, canOperate, approvalMode, isTestMode } = usePharmacyContext();
  return {
    status: governanceStatus,
    canOperate,
    isPending: governanceStatus === 'INCOMPLETE',
    isSuspended: governanceStatus === 'SUSPENDED',
    isActive: governanceStatus === 'ACTIVE',
    approvalMode,
    isTestMode,
  };
}

/**
 * Hook to get current role type
 */
export function useRoleType() {
  const { roleType, roleDisplayName } = usePharmacyContext();
  return {
    roleType,
    roleDisplayName,
    isOwner: roleType === 'PHARMACY_OWNER',
    isSuperintendent: roleType === 'SUPERINTENDENT_PHARMACIST',
    isSupervising: roleType === 'SUPERVISING_PHARMACIST',
    isStaff: roleType === 'STAFF',
  };
}

/**
 * Hook to check financial access
 */
export function useHasFinancialsAccess(): boolean {
  const { permissions } = usePharmacyContext();
  return checkPermission(permissions, 'financials', 'view');
}

/**
 * Hook to check if user can manage staff
 */
export function useCanManageStaff(): boolean {
  const { permissions } = usePharmacyContext();
  return checkPermission(permissions, 'staff', 'manage');
}

/**
 * Hook to check if user can verify prescriptions
 */
export function useCanVerifyPrescriptions(): boolean {
  const { permissions } = usePharmacyContext();
  return checkPermission(permissions, 'prescriptions', 'verify');
}
