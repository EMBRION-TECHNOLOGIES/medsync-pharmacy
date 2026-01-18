import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pharmacyVerificationService, AdminPharmacyListResponse, VerificationEvent } from './service';

export const useAdminPharmacies = (
  filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
  options?: { enabled?: boolean }
) =>
  useQuery<AdminPharmacyListResponse>({
    queryKey: ['admin', 'pharmacies', filters],
    queryFn: () => pharmacyVerificationService.listPharmacies(filters),
    keepPreviousData: true,
    enabled: options?.enabled !== false,
  });

export const usePharmacyVerificationEvents = (
  pharmacyId?: string,
  options?: { enabled?: boolean }
) =>
  useQuery<VerificationEvent[]>({
    queryKey: ['admin', 'pharmacies', pharmacyId, 'events'],
    queryFn: () => pharmacyVerificationService.getEvents(pharmacyId!),
    enabled: (options?.enabled !== false) && !!pharmacyId,
    staleTime: 60 * 1000,
  });

export const useUpdatePharmacyVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pharmacyId,
      status,
      notes,
    }: {
      pharmacyId: string;
      status: 'pending' | 'approved' | 'rejected';
      notes?: string;
    }) => pharmacyVerificationService.updateStatus(pharmacyId, status, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pharmacies'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'pharmacies', variables.pharmacyId, 'events'],
      });
    },
  });
};

export const useSetTestMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pharmacyId,
      enabled,
      notes,
    }: {
      pharmacyId: string;
      enabled: boolean;
      notes?: string;
    }) => pharmacyVerificationService.setTestMode(pharmacyId, enabled, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pharmacies'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'pharmacies', variables.pharmacyId, 'events'],
      });
    },
  });
};

export const useUpdateComplianceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pharmacyId,
      item,
      verified,
    }: {
      pharmacyId: string;
      item: string;
      verified: boolean;
    }) => pharmacyVerificationService.updateComplianceItem(pharmacyId, item, verified),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pharmacies'] });
    },
  });
};


