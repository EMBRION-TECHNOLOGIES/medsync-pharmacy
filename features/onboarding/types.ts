/**
 * Pharmacy Governance Onboarding Types
 */

export type PharmacyRoleType =
  | 'PHARMACY_OWNER'
  | 'SUPERINTENDENT_PHARMACIST'
  | 'SUPERVISING_PHARMACIST'
  | 'STAFF';

export type GovernanceStatus =
  | 'INCOMPLETE'
  | 'ACTIVE'
  | 'SUSPENDED';


export interface GovernanceStatusDetails {
  status: GovernanceStatus;
  hasSuperintendent: boolean;
  hasLocations: boolean;
  documentsUploaded: boolean;
  adminApproved: boolean;
  canOperate: boolean;
  missingRequirements: string[];
  pendingDocuments: string[];
}

export interface PharmacyGovernanceSummary {
  pharmacyId: string;
  pharmacyName: string;
  governanceStatus: GovernanceStatus;
  statusDetails: GovernanceStatusDetails;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  createdAt: string;
  lastUpdated: string;
}

export interface OnboardingStatus extends PharmacyGovernanceSummary {
  requiredRoles: {
    roleType: PharmacyRoleType;
    displayName: string;
    isConfirmed: boolean;
  }[];
}

export interface CreatePharmacyInput {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  pcnRegistrationNumber?: string;
  cacRegistrationNumber?: string;
  cacBusinessName?: string;
  initiatorRole: PharmacyRoleType;
  openingTime?: string; // HH:mm format, e.g. "08:00"
  closingTime?: string; // HH:mm format, e.g. "20:00"
}


// Role display configurations
export const ROLE_TYPE_DISPLAY: Record<PharmacyRoleType, { name: string; description: string }> = {
  PHARMACY_OWNER: {
    name: 'Pharmacy Owner',
    description:
      'Business owner with full financial control and administrative access. Usually the CAC-listed owner.',
  },
  SUPERINTENDENT_PHARMACIST: {
    name: 'Superintendent Pharmacist',
    description:
      'PCN-registered pharmacist who holds the pharmacy license. Regulatory anchor responsible for compliance.',
  },
  SUPERVISING_PHARMACIST: {
    name: 'Supervising Pharmacist',
    description:
      'Day-to-day pharmacist overseeing operations. Handles prescription verification and dispensing. No financial access.',
  },
  STAFF: {
    name: 'Staff',
    description: 'Support staff with limited operational access. Can view orders but cannot manage.',
  },
};

/**
 * Required roles for pharmacy activation
 */
export const REQUIRED_GOVERNANCE_ROLES: PharmacyRoleType[] = [
  'PHARMACY_OWNER',
  'SUPERINTENDENT_PHARMACIST',
  'SUPERVISING_PHARMACIST',
];

// Governance status display configurations
export const GOVERNANCE_STATUS_DISPLAY: Record<
  GovernanceStatus,
  { label: string; color: string; description: string }
> = {
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
