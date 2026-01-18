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
    queryKey: ['pharmacy-profile'],
    queryFn: () => pharmacyService.getPharmacyProfile(),
    enabled: options.enabled ?? true,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - reasonable cache time
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch on reconnect
  });
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ['pharmacy-dashboard'],
    queryFn: () => pharmacyService.getDashboardData(),
    staleTime: 30 * 1000, // 30 seconds - dashboard should be relatively fresh
    refetchInterval: 60 * 1000, // Refetch every minute for live updates
    refetchOnWindowFocus: true,
  });
};

export const useLocations = (pharmacyId?: string) => {
  return useQuery({
    queryKey: ['pharmacy', pharmacyId, 'locations'],
    queryFn: () => pharmacyService.getLocations(pharmacyId!),
    enabled: !!pharmacyId,
    staleTime: 0, // Always refetch - no stale time to ensure fresh data
    gcTime: 0, // Don't cache - always get fresh data (v5 renamed cacheTime to gcTime)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};

export const useCreateLocation = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      address: string;
      city?: string;
      phone?: string;
      latitude?: number;
      longitude?: number;
      supervisor: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        password?: string;
        licenseNumber?: string;
        userId?: string;
      };
    }) => pharmacyService.createLocation(pharmacyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'locations'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'staff'] });
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

export const useDeleteLocation = (pharmacyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) => pharmacyService.deleteLocation(pharmacyId, locationId),
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

// inviteStaff hook removed - use instant user creation via CreateUserDialog instead

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

