/**
 * Pharmacy Team Service
 * 
 * API calls for managing pharmacy team members
 */

import { api } from '@/lib/api';
import { PharmacyRoleType } from '@prisma/client';

export interface AddPersonInput {
  name: string;
  email: string;
  phone?: string;
  roleType: PharmacyRoleType;
  password: string;
  forcePasswordReset?: boolean;
  pcnNumber?: string;
  licenseExpiryDate?: string;
  locationIds?: string[];
}

export interface UpdatePersonInput {
  name?: string;
  phone?: string;
  roleType?: PharmacyRoleType;
  locationId?: string | null;
  pcnNumber?: string;
  licenseExpiryDate?: string;
}

export interface ConfirmRoleInput {
  attestations: Record<string, boolean>;
  pcnNumber?: string;
  licenseExpiryDate?: string;
  signature?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleType: PharmacyRoleType;
  roleDisplayName: string;
  status: 'active' | 'pending' | 'confirmed' | 'revoked' | 'expired' | 'inactive';
  isActive: boolean;
  confirmedAt: Date | null;
  createdAt: Date;
  locationId?: string | null;
  locationName?: string | null;
}

export interface UpdatePersonResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleType: PharmacyRoleType;
  roleDisplayName: string;
  locationId: string | null;
  locationName: string | null;
  message: string;
}

export interface AddPersonResponse {
  personId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  roleType: PharmacyRoleType;
  roleDisplayName: string;
  status: 'active';
  message: string;
}

/**
 * Add a person to the pharmacy team
 */
export async function addPerson(pharmacyId: string, data: AddPersonInput): Promise<AddPersonResponse> {
  const response = await api.post(`/onboarding/pharmacy/${pharmacyId}/add-person`, data);
  // API interceptor already unwraps { success: true, data: {...} } to just {...}
  // So response.data is already the data object, not response.data.data
  return response.data;
}

/**
 * Get pharmacy team members
 */
export async function getPharmacyTeam(pharmacyId: string): Promise<TeamMember[]> {
  const response = await api.get(`/onboarding/pharmacy/${pharmacyId}/team`);
  // API interceptor unwraps response: backend { success: true, data: { team: [...] } } becomes response.data = { team: [...] }
  return response.data.team || [];
}

/**
 * Confirm a role in-app
 */
export async function confirmRoleInApp(
  pharmacyId: string,
  personId: string,
  data: ConfirmRoleInput
): Promise<{ message: string; governanceStatus: string; canOperate: boolean }> {
  const response = await api.post(`/onboarding/pharmacy/${pharmacyId}/confirm-role/${personId}`, data);
  return response.data.data;
}

/**
 * Remove a person from pharmacy team
 */
export async function removePerson(pharmacyId: string, personId: string, reason?: string): Promise<void> {
  await api.delete(`/onboarding/pharmacy/${pharmacyId}/team/${personId}`, {
    data: { reason },
  });
}

/**
 * Update a pharmacy team member
 */
export async function updatePerson(
  pharmacyId: string,
  personId: string,
  data: UpdatePersonInput
): Promise<UpdatePersonResponse> {
  const response = await api.patch(`/onboarding/pharmacy/${pharmacyId}/team/${personId}`, data);
  return response.data;
}

export interface ReactivatePersonResponse {
  id: string;
  name: string;
  email: string;
  roleType: PharmacyRoleType;
  roleDisplayName: string;
  message: string;
}

/**
 * Reactivate a removed team member
 */
export async function reactivatePerson(
  pharmacyId: string,
  personId: string
): Promise<ReactivatePersonResponse> {
  const response = await api.post(`/onboarding/pharmacy/${pharmacyId}/team/${personId}/reactivate`);
  return response.data;
}
