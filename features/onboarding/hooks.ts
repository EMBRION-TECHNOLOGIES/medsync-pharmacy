/**
 * Pharmacy Governance Onboarding Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as onboardingService from './service';
import type {
  CreatePharmacyInput,
} from './types';

// Query keys
export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: (pharmacyId: string) => [...onboardingKeys.all, 'status', pharmacyId] as const,
  auditLogs: (pharmacyId: string) => [...onboardingKeys.all, 'audit-logs', pharmacyId] as const,
};

/**
 * Get onboarding status for a pharmacy
 */
export function useOnboardingStatus(pharmacyId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.status(pharmacyId || ''),
    queryFn: () => (pharmacyId ? onboardingService.getOnboardingStatus(pharmacyId) : null),
    enabled: !!pharmacyId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get governance audit logs
 */
export function useAuditLogs(
  pharmacyId: string | undefined,
  options: { limit?: number; offset?: number; action?: string } = {}
) {
  return useQuery({
    queryKey: [...onboardingKeys.auditLogs(pharmacyId || ''), options],
    queryFn: () => (pharmacyId ? onboardingService.getAuditLogs(pharmacyId, options) : null),
    enabled: !!pharmacyId,
    staleTime: 30 * 1000,
  });
}

/**
 * Create a new pharmacy
 */
export function useCreatePharmacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePharmacyInput) => onboardingService.createPharmacy(data),
    onSuccess: (result) => {
      toast.success(result.message || 'Pharmacy created successfully');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create pharmacy');
    },
  });
}

