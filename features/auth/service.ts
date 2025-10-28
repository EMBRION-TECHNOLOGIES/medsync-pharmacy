import { api } from '@/lib/api';
import { LoginInput, RegisterInput, AuthUser, Tokens } from '@/lib/zod-schemas';

export const authService = {
  async login(credentials: LoginInput): Promise<{ user: AuthUser; tokens: Tokens }> {
    try {
      const response = await api.post('/auth/login', credentials);
      
      // Check if the API response indicates success
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (!response.data.success) {
          // Handle API error response
          const error = new Error(response.data.error?.message || 'Login failed');
          (error as Error & { response?: unknown }).response = {
            status: response.status,
            data: response.data
          };
          throw error;
        }
      }
      
      // The response.data is already unwrapped by the API interceptor for successful responses
      // So it should contain { user, tokens } directly
      const { user, tokens } = response.data;
      
      // Store tokens in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
      
      return { user, tokens };
    } catch (error) {
      console.error('Login error details:', error);
      throw error;
    }
  },

  async register(userData: RegisterInput): Promise<{ user: AuthUser; tokens: Tokens }> {
    const response = await api.post('/auth/register', userData);
    
    // Check if the API response indicates success
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        // Handle API error response
        const error = new Error(response.data.error?.message || 'Registration failed');
        (error as Error & { response?: unknown }).response = {
          status: response.status,
          data: response.data
        };
        throw error;
      }
    }
    
    // The response.data is already unwrapped by the API interceptor for successful responses
    // So it should contain { user, tokens } directly
    const { user, tokens } = response.data;
    
    // Store tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    
    return { user, tokens };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens from localStorage regardless of API call success
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get('/auth/me');
    
    // Log the raw response to debug
    console.log('Raw API response from /auth/me:', response);
    console.log('Response data:', response.data);
    
    // The response.data is already unwrapped by the API interceptor
    // So it should contain { user } directly
    // But let's check if the structure is different
    let user;
    if (response.data.user) {
      user = response.data.user;
    } else if (response.data && !response.data.user) {
      // Maybe the user data is directly in response.data
      user = response.data;
    } else {
      throw new Error('Invalid response structure from /auth/me');
    }
    
    // Log the user data to debug
    console.log('User data from /auth/me:', user);
    console.log('User firstName:', user?.firstName);
    console.log('User lastName:', user?.lastName);
    console.log('User email:', user?.email);
    
    // CRITICAL: The backend MUST return firstName and lastName
    // If they're missing, this is a backend issue that needs to be fixed
    if (!user.firstName || !user.lastName) {
      console.error('❌ BACKEND ISSUE: /auth/me endpoint is not returning firstName and lastName');
      console.error('Expected: { firstName: "Abdul", lastName: "Ibrahim" }');
      console.error('Received:', { firstName: user.firstName, lastName: user.lastName });
      
      // Don't use email fallback - this masks the real problem
      // Instead, throw an error to force backend fix
      throw new Error(
        `Backend API issue: /auth/me endpoint missing firstName or lastName. ` +
        `Expected proper user data from database, but got: firstName="${user.firstName}", lastName="${user.lastName}". ` +
        `Please fix the backend to return complete user profile data.`
      );
    }
    
    // Only set pharmacyId if not already present
    if (!user.pharmacyId) {
      try {
        const pharmacyResponse = await api.get('/pharmacy-management/my-pharmacy');
        if (pharmacyResponse.data?.pharmacy) {
          user.pharmacyId = pharmacyResponse.data.pharmacy.id;
        }
      } catch (error) {
        console.warn('Could not fetch pharmacy profile for pharmacyId:', error);
      }
    }
    
    console.log('✅ Final user data (correct):', user);
    return user;
  },

  async refreshToken(): Promise<Tokens> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh', { refreshToken });
    const tokens = response.data.tokens;
    
    // Update tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    
    return tokens;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  // Utility methods
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  getStoredRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  },

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
};

