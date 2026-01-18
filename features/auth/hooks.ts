import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from './service';
import { LoginInput, RegisterInput, AuthUser, Tokens } from '@/lib/zod-schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrg } from '@/store/useOrg';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { getDefaultPermissions } from '@/lib/permissions';
import type { PharmacyRoleType } from '@/features/onboarding/types';

/**
 * Populate org and pharmacy context stores from auth response.
 * Called after login and on /auth/me response.
 */
function populateStoresFromPharmacyContext(pharmacyContext: any) {
  if (!pharmacyContext) return;

  const orgStore = useOrg.getState();
  const pharmacyCtxStore = usePharmacyContext.getState();

  // Populate useOrg store (for X-Pharmacy-Id and X-Location-Id headers)
  orgStore.setPharmacy(pharmacyContext.pharmacyId, pharmacyContext.pharmacyName);

  // For location-scoped users, set their bound location immediately
  // For org-scoped users, they can choose via OrgSwitcher
  if (pharmacyContext.userLocationId) {
    orgStore.setLocation(pharmacyContext.userLocationId, pharmacyContext.userLocationName || '');
  } else if (pharmacyContext.isOrgScoped && pharmacyContext.locations?.length > 0) {
    // Org-scoped user without a location - leave as "All Locations" (empty string)
    // They can select via OrgSwitcher if they want
  }

  // ALWAYS derive permissions from roleType using frontend config
  // Backend permissions may be incomplete/stale - frontend is source of truth for UI permissions
  const roleType = (pharmacyContext.roleType || 'STAFF') as PharmacyRoleType;
  const derivedPermissions = getDefaultPermissions(roleType);

  // Populate usePharmacyContext store (for permissions, role, governance)
  pharmacyCtxStore.setContext({
    pharmacyId: pharmacyContext.pharmacyId,
    pharmacyName: pharmacyContext.pharmacyName,
    roleType: roleType,
    permissions: derivedPermissions,
    governanceStatus: pharmacyContext.governanceStatus,
    canOperate: pharmacyContext.canOperate,
  });
}

export const useAuth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Check if user has a valid token on mount
  useEffect(() => {
    const token = authService.getStoredToken();
    if (token) {
      // User has a token, try to get user info
      queryClient.prefetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authService.getMe,
        retry: false,
      }).then((result: any) => {
        // ✅ VALIDATE ROLE ON STARTUP
        if (result) {
          const allowedRoles = ['PHARMACIST', 'PHARMACY_OWNER', 'ADMIN'];

          if (!allowedRoles.includes(result.role)) {
            console.warn('⚠️ Non-pharmacy user detected, logging out:', result.role);
            authService.clearTokens();
            queryClient.clear();
          } else {
            // ✅ Populate stores with pharmacy context on app startup
            if (result.pharmacyContext) {
              populateStoresFromPharmacyContext(result.pharmacyContext);
            }
          }
        }
      }).catch((error) => {
        console.error('Auth check failed:', error);
        authService.clearTokens();
      });
    }
    setIsInitialized(true);
  }, [queryClient]);

  const { data: user, isLoading, error, refetch } = useQuery<AuthUser & { pharmacyContext?: any }, Error>({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
    retry: false,
    staleTime: 0, // Always fetch fresh data to get latest verification status
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: authService.isAuthenticated() && isInitialized,
  });

  // Populate stores whenever user data changes
  useEffect(() => {
    if (user?.pharmacyContext) {
      populateStoresFromPharmacyContext(user.pharmacyContext);
    }
  }, [user]);


  return {
    user,
    isLoading: isLoading || !isInitialized,
    isAuthenticated: !!user,
    error,
    refetch,
  };
};

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginInput) => authService.login(credentials),
    onSuccess: async (data) => {
      const userRole = data.user.role;

      // ✅ ENFORCE PHARMACY PORTAL ACCESS
      const allowedRoles = ['PHARMACIST', 'PHARMACY_OWNER', 'ADMIN'];

      if (!allowedRoles.includes(userRole)) {
        // BLOCK non-pharmacy users
        const errorMessage = userRole === 'PATIENT'
          ? '❌ Access Denied\n\nThis portal is for pharmacy staff only.\n\nPatients should use the TeraSync mobile app.'
          : '❌ Access Denied\n\nThis portal is for pharmacy staff only.';

        console.error('Platform access denied:', userRole);

        // Clear any stored tokens
        authService.clearTokens();

        throw new Error(errorMessage);
      }

      // ✅ Populate stores with pharmacy context from login response
      if (data.pharmacyContext) {
        populateStoresFromPharmacyContext(data.pharmacyContext);
      }

      // Set initial user data from login response
      queryClient.setQueryData(['auth', 'me'], data.user);

      // CRITICAL: Immediately refetch fresh user data to get latest verification status
      try {
        const freshUserData = await queryClient.fetchQuery({
          queryKey: ['auth', 'me'],
          queryFn: authService.getMe,
          staleTime: 0,
        });

        // Re-populate stores with fresh data (in case it differs)
        if ((freshUserData as any)?.pharmacyContext) {
          populateStoresFromPharmacyContext((freshUserData as any).pharmacyContext);
        }

        queryClient.setQueryData(['auth', 'me'], freshUserData);
      } catch (error) {
        console.warn('Failed to fetch fresh user data after login:', error);
      }

      if (userRole === 'ADMIN') {
        router.push('/admin/verification');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      authService.clearTokens();
    },
  });
};

export const useRegister = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterInput) => authService.register(userData),
    onSuccess: (data) => {
      const userRole = data.user.role;
      
      // ✅ VERIFY PHARMACY OWNER ROLE (only pharmacy owners can register)
      if (userRole !== 'PHARMACY_OWNER') {
        console.error('Invalid user type for pharmacy registration:', userRole);
        authService.clearTokens();
        throw new Error('❌ Only pharmacy owners can register pharmacies');
      }
      
      // Proceed with registration success
      queryClient.setQueryData(['auth', 'me'], data.user);
      router.push('/dashboard');
    },
    onError: (error) => {
      console.error('Registration error:', error);
      authService.clearTokens();
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const clearAllStores = () => {
    // Clear org store (pharmacy/location selection)
    useOrg.getState().clear();
    // Clear pharmacy context store (role/permissions)
    usePharmacyContext.getState().clearContext();
  };

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      authService.clearTokens();
      clearAllStores();
      router.push('/login');
    },
    onError: () => {
      // Even if logout API fails, clear local state
      queryClient.clear();
      authService.clearTokens();
      clearAllStores();
      router.push('/login');
    },
  });
};

export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.refreshToken,
    onSuccess: () => {
      // Token refreshed successfully, refetch user data
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => {
      // Refresh failed, clear auth state
      authService.clearTokens();
      queryClient.clear();
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
};

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      router.push('/login');
    },
  });
};

