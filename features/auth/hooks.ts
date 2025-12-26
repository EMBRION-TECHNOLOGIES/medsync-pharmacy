import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from './service';
import { LoginInput, RegisterInput, AuthUser, Tokens } from '@/lib/zod-schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      }).then((result) => {
        // ✅ VALIDATE ROLE ON STARTUP
        if (result?.data) {
        const allowedRoles = ['PHARMACIST', 'PHARMACY_OWNER', 'ADMIN'];
          
          if (!allowedRoles.includes(result.data.role)) {
            console.warn('⚠️ Non-pharmacy user detected, logging out:', result.data.role);
            authService.clearTokens();
            queryClient.clear();
          }
        }
      }).catch((error) => {
        console.error('Auth check failed:', error);
        authService.clearTokens();
      });
    }
    setIsInitialized(true);
  }, [queryClient]);

  const { data: user, isLoading, error, refetch } = useQuery<AuthUser, Error>({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
    retry: false,
    staleTime: 0, // Always fetch fresh data to get latest verification status
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: authService.isAuthenticated() && isInitialized,
    onError: (error) => {
      console.error('❌ Auth error - likely backend issue:', error);
      // If it's a backend data issue, show a user-friendly message
      if (error.message.includes('Backend API issue')) {
        console.error('🔧 BACKEND FIX NEEDED: /auth/me endpoint missing user data');
        // Don't logout user, just show error in console for now
        // The backend team needs to fix this
      }
    },
  });


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
          ? '❌ Access Denied\n\nThis portal is for pharmacy staff only.\n\nPatients should use the MedSync mobile app.'
          : '❌ Access Denied\n\nThis portal is for pharmacy staff only.';
        
        console.error('Platform access denied:', userRole);
        
        // Clear any stored tokens
        authService.clearTokens();
        
        throw new Error(errorMessage);
      }
      
      // Set initial user data from login response
      queryClient.setQueryData(['auth', 'me'], data.user);
      
      // CRITICAL: Immediately refetch fresh user data to get latest verification status
      // This ensures we have the most up-to-date verification status after login
      try {
        const freshUserData = await queryClient.fetchQuery({
          queryKey: ['auth', 'me'],
          queryFn: authService.getMe,
          staleTime: 0, // Force fresh fetch
        });
        
        // Update cache with fresh data (includes latest verification status)
        queryClient.setQueryData(['auth', 'me'], freshUserData);
        
        console.log('✅ Fresh user data fetched after login:', freshUserData);
      } catch (error) {
        console.warn('⚠️ Failed to fetch fresh user data after login, using login response data:', error);
        // Continue with login response data if refetch fails
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
      
      // Error toast is handled in the login form component
      // This ensures we don't show duplicate toasts
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

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      authService.clearTokens();
      router.push('/login');
    },
    onError: () => {
      // Even if logout API fails, clear local state
      queryClient.clear();
      authService.clearTokens();
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

