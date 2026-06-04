import type { QueryClient } from '@tanstack/react-query';

/**
 * Refetch pharmacy profile / governance after team, location, or profile changes.
 */
export function invalidatePharmacyOperationalQueries(
  queryClient: QueryClient,
  pharmacyId?: string | null
) {
  queryClient.invalidateQueries({ queryKey: ['pharmacy-profile'] });
  if (pharmacyId) {
    queryClient.invalidateQueries({ queryKey: ['pharmacy-context', pharmacyId] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-status', pharmacyId] });
    queryClient.invalidateQueries({ queryKey: ['pharmacy-team', pharmacyId] });
    queryClient.invalidateQueries({ queryKey: ['pharmacy', pharmacyId, 'locations'] });
  }
}
