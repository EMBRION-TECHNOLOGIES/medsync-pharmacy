/**
 * Pharmacy Governance Onboarding Service
 */

import { api } from '@/lib/api';
import type {
  OnboardingStatus,
  CreatePharmacyInput,
} from './types';

const BASE_URL = '/onboarding';

/**
 * Create a new pharmacy entity
 */
export async function createPharmacy(data: CreatePharmacyInput) {
  const response = await api.post<{
    pharmacy: { id: string; name: string; governanceStatus: string };
    initiatorRole: string;
    remainingRoles: { roleType: string; displayName: string }[];
    message: string;
  }>(`${BASE_URL}/pharmacy`, data);
  return response;
}


/**
 * Get onboarding status for a pharmacy
 */
export async function getOnboardingStatus(pharmacyId: string) {
  const response = await api.get<OnboardingStatus>(`${BASE_URL}/pharmacy/${pharmacyId}/status`);
  return response.data; // Return data directly, not the full AxiosResponse
}


/**
 * Get governance audit logs
 */
export async function getAuditLogs(
  pharmacyId: string,
  options: { limit?: number; offset?: number; action?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.action) params.set('action', options.action);

  const response = await api.get<{
    logs: Array<{
      id: string;
      action: string;
      roleType: string | null;
      details: Record<string, unknown>;
      createdAt: string;
      actor: { id: string; firstName: string | null; lastName: string | null; email: string };
      targetUser: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
    }>;
    total: number;
  }>(`${BASE_URL}/pharmacy/${pharmacyId}/audit-logs?${params.toString()}`);
  return response;
}

// ============================================
// Document Upload Functions (Kept for reference, not used in UI)
// ============================================

export interface GovernanceDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
  uploadedAt: string;
  uploader: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  verifier?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

/**
 * Get governance documents for a pharmacy (not used in UI - documents sent via email)
 */
export async function getDocuments(pharmacyId: string) {
  const response = await api.get<{
    documents: GovernanceDocument[];
  }>(`${BASE_URL}/pharmacy/${pharmacyId}/documents`);
  return response;
}

/**
 * Upload a governance document (not used in UI - documents sent via email)
 */
export async function uploadDocument(
  pharmacyId: string,
  data: {
    documentType: string;
    documentUrl: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
  }
) {
  const response = await api.post<{
    document: {
      id: string;
      documentType: string;
      fileName: string;
      verificationStatus: string;
      uploadedAt: string;
    };
    message: string;
  }>(`${BASE_URL}/pharmacy/${pharmacyId}/documents`, data);
  return response;
}

/**
 * Delete a governance document (not used in UI - documents sent via email)
 */
export async function deleteDocument(pharmacyId: string, documentId: string) {
  const response = await api.delete<{ message: string }>(
    `${BASE_URL}/pharmacy/${pharmacyId}/documents/${documentId}`
  );
  return response;
}

/**
 * Document type display names (used for email instructions checklist)
 */
export const DOCUMENT_TYPE_DISPLAY: Record<string, { label: string; description: string; requiredFor: string[] }> = {
  pcn_certificate: {
    label: 'PCN Registration Certificate',
    description: 'Pharmacy Council of Nigeria registration certificate for the pharmacy premises',
    requiredFor: ['SUPERINTENDENT_PHARMACIST'],
  },
  cac_registration: {
    label: 'CAC Registration Document',
    description: 'Corporate Affairs Commission registration certificate',
    requiredFor: ['PHARMACY_OWNER'],
  },
  pharmacist_license: {
    label: 'Pharmacist License',
    description: 'Valid practicing license from the Pharmacy Council of Nigeria',
    requiredFor: ['SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST'],
  },
  government_id: {
    label: 'Government-Issued ID',
    description: 'Valid government-issued identification (NIN, Passport, or Drivers License)',
    requiredFor: ['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST'],
  },
  proof_of_premises: {
    label: 'Proof of Premises',
    description: 'Document showing ownership or lease of the pharmacy premises',
    requiredFor: ['PHARMACY_OWNER'],
  },
  premises_license: {
    label: 'Premises Registration Certificate',
    description: 'PCN premises registration certificate',
    requiredFor: ['PHARMACY_OWNER'],
  },
  nafdac_license: {
    label: 'NAFDAC License',
    description: 'National Agency for Food and Drug Administration and Control license (if applicable)',
    requiredFor: [],
  },
};

/**
 * Export as service object for convenience
 */
export const onboardingService = {
  createPharmacy,
  getOnboardingStatus,
  getAuditLogs,
  getDocuments,
  uploadDocument,
  deleteDocument,
};
