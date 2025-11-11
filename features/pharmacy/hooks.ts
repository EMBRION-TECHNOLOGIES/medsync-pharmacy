import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyService } from './service';
import { Location, PharmacyUser } from '@/lib/zod-schemas';

export const usePharmacy = (pharmacyId?: string) => {
  return useQuery({
    queryKey: ['pharmacy', pharmacyId],
    queryFn: () => pharmacyService.getPharmacy(pharmacyId!),
    enabled: !!pharmacyId,
  });
};

export const usePharmacyProfile = (options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ['pharmacy', 'profile'],
    queryFn: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching pharmacy profile...');
      }
      return pharmacyService.getPharmacyProfile();
    },
    enabled: options.enabled ?? true, // Ensure the query is enabled
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('Pharmacy profile fetch error:', error);
    },
    onSuccess: (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Pharmacy profile fetch success:', data);
      }
    },
  });
};

export const useLocations = (pharmacyId?: string) => {
  return useQuery({
    queryKey: ['pharmacy', pharmacyId, 'locations'],
    queryFn: () => pharmacyService.getLocations(pharmacyId!),
    enabled: !!pharmacyId,
  });
};

export const useCreateLocation = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Location>) => pharmacyService.createLocation(pharmacyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'locations'] });
    },
  });
};

export const useUpdateLocation = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: Partial<Location> }) =>
      pharmacyService.updateLocation(pharmacyId, locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'locations'] });
    },
  });
};

export const usePharmacyStaff = (pharmacyId?: string) => {
  return useQuery({
    queryKey: ['pharmacy', pharmacyId, 'staff'],
    queryFn: () => pharmacyService.getStaff(pharmacyId!),
    enabled: !!pharmacyId,
  });
};

export const useInviteStaff = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: string; locationId?: string }) => {
      if (!pharmacyId) {
        throw new Error('Pharmacy ID is required to invite staff');
      }
      return pharmacyService.inviteStaff(pharmacyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'locations'] });
    },
    onError: (error) => {
      console.error('Failed to invite staff:', error);
    },
  });
};

export const useUpdateUserRole = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      pharmacyService.updateUserRole(pharmacyId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'staff'] });
    },
  });
};

