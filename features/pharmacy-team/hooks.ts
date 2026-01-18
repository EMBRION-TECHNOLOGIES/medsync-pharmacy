/**
 * Pharmacy Team Hooks
 * 
 * React Query hooks for pharmacy team management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addPerson,
  getPharmacyTeam,
  confirmRoleInApp,
  removePerson,
  updatePerson,
  reactivatePerson,
  AddPersonInput,
  ConfirmRoleInput,
  UpdatePersonInput,
  TeamMember,
} from './service';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { toast } from 'sonner';

/**
 * Get pharmacy team members
 */
export function usePharmacyTeam() {
  const { pharmacyId } = usePharmacyContext();

  return useQuery<TeamMember[]>({
    queryKey: ['pharmacy-team', pharmacyId],
    queryFn: () => getPharmacyTeam(pharmacyId!),
    enabled: !!pharmacyId,
  });
}

/**
 * Add a person to the pharmacy team
 */
export function useAddPerson() {
  const { pharmacyId } = usePharmacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddPersonInput) => addPerson(pharmacyId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add person');
    },
  });
}

/**
 * Confirm a role in-app
 */
export function useConfirmRole() {
  const { pharmacyId } = usePharmacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: ConfirmRoleInput }) =>
      confirmRoleInApp(pharmacyId!, personId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-context'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to confirm role');
    },
  });
}

/**
 * Remove a person from pharmacy team
 */
export function useRemovePerson() {
  const { pharmacyId } = usePharmacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personId, reason }: { personId: string; reason?: string }) =>
      removePerson(pharmacyId!, personId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
      toast.success('Team member removed. Access revoked.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove team member');
    },
  });
}

/**
 * Update a pharmacy team member
 */
export function useUpdatePerson() {
  const { pharmacyId } = usePharmacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: UpdatePersonInput }) =>
      updatePerson(pharmacyId!, personId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
      toast.success(data.message || 'Team member updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update team member');
    },
  });
}

/**
 * Reactivate a removed team member
 */
export function useReactivatePerson() {
  const { pharmacyId } = usePharmacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personId: string) => reactivatePerson(pharmacyId!, personId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
      toast.success(data.message || 'Team member reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reactivate team member');
    },
  });
}
