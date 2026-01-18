/**
 * Pharmacy Governance Permission System
 * Mirrors the backend permissions.ts config
 */

import type { PharmacyRoleType, GovernanceStatus } from '@/features/onboarding/types';

// Permission structure
export interface CategoryPermissions {
  view: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  cancel?: boolean;
  verify?: boolean;
  book?: boolean;
  payouts?: boolean;
  pricing?: boolean;
  edit?: boolean;
  invite?: boolean;
  manage?: boolean;
}

export interface Permissions {
  orders: CategoryPermissions;
  prescriptions: CategoryPermissions;
  dispatch: CategoryPermissions;
  financials: CategoryPermissions;
  settings: CategoryPermissions;
  staff: CategoryPermissions;
  locations: CategoryPermissions;
  compliance: CategoryPermissions;
  auditLogs: CategoryPermissions;
  governance: CategoryPermissions;
}

// Governance-specific permissions interface
export interface GovernancePermissions extends CategoryPermissions {
  uploadDocuments?: boolean;
  manageRoles?: boolean;
  viewAuditLogs?: boolean;
}

/**
 * ROLE-BASED ACCESS MODEL
 * 
 * OWNER: Everything - business owner, financially responsible, legally accountable
 * SUPERINTENDENT: Compliance + oversight, no money - regulatory anchor (PCN-facing)
 * SUPERVISOR: Operations at one location only - day-to-day manager
 * STAFF: Assist, no authority - operational helpers
 */

// PHARMACY OWNER - Full access to everything
export const OWNER_PERMISSIONS: Permissions = {
  orders: { view: true, create: true, update: true, cancel: true },
  prescriptions: { view: true, verify: false },
  dispatch: { view: true, book: true },
  financials: { view: true, payouts: true, pricing: true },
  settings: { view: true, edit: true },
  staff: { view: true, invite: true, manage: true },
  locations: { view: true, manage: true },
  compliance: { view: true },
  auditLogs: { view: true },
  governance: { view: true, uploadDocuments: true, manageRoles: true, viewAuditLogs: true },
};

// SUPERINTENDENT PHARMACIST - Clinical & regulatory authority, NO financials, NO settings
export const SUPERINTENDENT_PERMISSIONS: Permissions = {
  orders: { view: true, create: false, update: false, cancel: false }, // Read-only
  prescriptions: { view: true, verify: true },
  dispatch: { view: true, book: false }, // Read-only awareness
  financials: { view: false, payouts: false, pricing: false }, // NO money access
  settings: { view: false, edit: false }, // NO business control
  staff: { view: true, invite: false, manage: false }, // Read-only - know who is practicing
  locations: { view: true, manage: false }, // Read-only - must know all locations
  compliance: { view: true }, // This is their core duty
  auditLogs: { view: true }, // Regulatory protection
  governance: { view: true, uploadDocuments: true, manageRoles: false, viewAuditLogs: true },
};

// SUPERVISING PHARMACIST - Location-scoped operations only
export const SUPERVISING_PHARMACIST_PERMISSIONS: Permissions = {
  orders: { view: true, create: true, update: true, cancel: false }, // Location-only fulfillment
  prescriptions: { view: true, verify: true },
  dispatch: { view: true, book: true }, // Location-only handover to riders
  financials: { view: false, payouts: false, pricing: false }, // NO money
  settings: { view: false, edit: false }, // NO authority
  staff: { view: true, invite: false, manage: false }, // Location-only - see staff they manage
  locations: { view: false, manage: false }, // They don't create branches
  compliance: { view: false }, // Already handled by superintendent
  auditLogs: { view: false }, // Not needed
  governance: { view: false, uploadDocuments: false, manageRoles: false, viewAuditLogs: false },
};

// STAFF - Minimal operational access, no authority
export const STAFF_PERMISSIONS: Permissions = {
  orders: { view: true, create: false, update: false, cancel: false }, // Location-only fulfillment tasks
  prescriptions: { view: true, verify: false },
  dispatch: { view: true, book: false }, // Can see dispatch status, cannot book
  financials: { view: false, payouts: false, pricing: false }, // Absolute NO
  settings: { view: false, edit: false }, // Security
  staff: { view: false, invite: false, manage: false }, // HR boundary
  locations: { view: false, manage: false }, // Not relevant
  compliance: { view: false }, // Legal boundary
  auditLogs: { view: false }, // Security
  governance: { view: false, uploadDocuments: false, manageRoles: false, viewAuditLogs: false },
};

/**
 * Get default permissions for a role type
 */
export function getDefaultPermissions(roleType: PharmacyRoleType): Permissions {
  switch (roleType) {
    case 'PHARMACY_OWNER':
      return OWNER_PERMISSIONS;
    case 'SUPERINTENDENT_PHARMACIST':
      return SUPERINTENDENT_PERMISSIONS;
    case 'SUPERVISING_PHARMACIST':
      return SUPERVISING_PHARMACIST_PERMISSIONS;
    case 'STAFF':
      return STAFF_PERMISSIONS;
    default:
      return STAFF_PERMISSIONS;
  }
}

/**
 * Check if a permission exists
 * @param permissions - User permissions object
 * @param category - Permission category (e.g., 'orders', 'financials')
 * @param action - Permission action (e.g., 'view', 'edit')
 */
export function checkPermission(
  permissions: Permissions | null | undefined,
  category: keyof Permissions,
  action: string
): boolean {
  if (!permissions) return false;
  const categoryPerms = permissions[category];
  if (!categoryPerms) return false;
  return (categoryPerms as Record<string, boolean>)[action] === true;
}

/**
 * Check if pharmacy can operate (is active)
 */
export function canPharmacyOperate(governanceStatus: GovernanceStatus | null | undefined): boolean {
  return governanceStatus === 'ACTIVE';
}

/**
 * Get governance status display info
 */
export function getGovernanceStatusDisplay(status: GovernanceStatus) {
  const displays: Record<GovernanceStatus, { label: string; color: string; description: string }> = {
    INCOMPLETE: {
      label: 'Incomplete Setup',
      color: 'orange',
      description: 'Missing required setup: Add a Superintendent Pharmacist and create locations to complete activation.',
    },
    ACTIVE: {
      label: 'Active',
      color: 'green',
      description: 'Your pharmacy is fully activated and can receive orders.',
    },
    SUSPENDED: {
      label: 'Suspended',
      color: 'red',
      description: 'Your pharmacy has been suspended. Please contact support.',
    },
  };

  return displays[status] || displays.INCOMPLETE;
}

// Navigation permission requirements
export const NAV_PERMISSIONS = {
  dashboard: { category: 'orders' as const, action: 'view' },
  orders: { category: 'orders' as const, action: 'view' },
  chat: { category: 'orders' as const, action: 'view' },
  dispatch: { category: 'dispatch' as const, action: 'view' },
  staff: { category: 'staff' as const, action: 'view' },
  locations: { category: 'locations' as const, action: 'view' },
  settings: { category: 'settings' as const, action: 'view' },
  financials: { category: 'financials' as const, action: 'view' },
  compliance: { category: 'compliance' as const, action: 'view' },
  auditLogs: { category: 'auditLogs' as const, action: 'view' },
};
