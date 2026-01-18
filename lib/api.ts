import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

// Function to get the base URL dynamically (handles WiFi network changes)
function getBaseURL(): string | undefined {
  if (envBaseUrl && envBaseUrl.length > 0) {
    return envBaseUrl.replace(/\/$/, '');
  }
  
  if (process.env.NODE_ENV === 'development') {
    // In browser, use the same hostname as the frontend (works with any WiFi network)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Use 127.0.0.1 instead of localhost for better browser compatibility
      const apiHost = hostname === 'localhost' ? '127.0.0.1' : hostname;
      return `http://${apiHost}:3000/api/v1`;
    }
    // SSR fallback
    return 'http://127.0.0.1:3000/api/v1';
  }
  
  return undefined;
}

const resolvedBaseUrl = getBaseURL();

if (!resolvedBaseUrl) {
  console.warn(
    '[TeraSync] NEXT_PUBLIC_API_BASE_URL is not set. API calls may fail until it is configured.'
  );
}

export const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// API Base URL configured in next.config.ts

// Request interceptor for adding Bearer token, dynamic baseURL, and idempotency key
api.interceptors.request.use(
  (config) => {
    // ✅ FIX: Re-resolve baseURL on each request to handle WiFi network changes
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const dynamicBaseURL = getBaseURL();
      if (dynamicBaseURL) {
        const oldBaseURL = config.baseURL;
        config.baseURL = dynamicBaseURL;
        // Debug: Log baseURL changes
        if (oldBaseURL !== dynamicBaseURL) {
          console.log(`[API] BaseURL updated: ${oldBaseURL} → ${dynamicBaseURL}`);
        }
      }
    }

    // Add Bearer token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach org/location context headers for multi-location enforcement (backend validates)
    if (typeof window !== 'undefined') {
      try {
        const rawOrg = localStorage.getItem('terasync-pharmacy-org');
        if (rawOrg) {
          const parsed = JSON.parse(rawOrg) as { state?: { pharmacyId?: string; locationId?: string } };
          const pharmacyId = parsed?.state?.pharmacyId;
          const locationId = parsed?.state?.locationId;

          if (pharmacyId && String(pharmacyId).trim().length > 0) {
            config.headers['X-Pharmacy-Id'] = String(pharmacyId).trim();
          }
          if (locationId && String(locationId).trim().length > 0) {
            config.headers['X-Location-Id'] = String(locationId).trim();
          }
        }
      } catch (e) {
        // Ignore malformed storage
      }
    }

    // Debug logging for API requests
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        hasToken: !!token,
        headers: config.headers,
        baseURL: config.baseURL,
        fullUrl: `${config.baseURL}${config.url}`
      });
    }

    // Add idempotency key for POST requests (order creation)
    if (config.method === 'post' && config.url?.includes('/chat-orders/') && config.url?.includes('/order')) {
      config.headers['Idempotency-Key'] = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling API response wrapper and errors
api.interceptors.response.use(
  (response) => {
    // Debug logging for API responses
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
        headers: response.headers
      });
    }
    
    // Unwrap API response format: { success, data, message, timestamp, correlationId }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success) {
        const nestedData = response.data.data;
        
        // Check for pagination at root level: { success, data, page, pageSize, total }
        const hasRootPagination = response.data.page !== undefined || 
                                  response.data.pageSize !== undefined || 
                                  response.data.total !== undefined;
        
        // Check for pagination object: { success, data, pagination: {...} }
        const hasPaginationObject = response.data.pagination !== undefined;
        
        // Check for pagination in nested data
        const nestedHasPagination = nestedData && (
          'page' in nestedData || 
          'pageSize' in nestedData || 
          'total' in nestedData || 
          'pagination' in nestedData ||
          'totalPages' in nestedData ||
          'limit' in nestedData
        );
        
        if (hasRootPagination) {
          // Backend returns: { success: true, data: [...], page: 1, pageSize: 20, total: 100 }
          // Pass through the full response.data (without unwrapping)
          return { 
            ...response, 
            data: {
              data: nestedData || [],
              page: response.data.page || 1,
              pageSize: response.data.pageSize || 20,
              total: response.data.total || 0,
            }
          };
        } else if (hasPaginationObject) {
          // Backend returns: { success: true, data: [...], pagination: {...} }
          return { 
            ...response, 
            data: {
              data: nestedData || [],
              pagination: response.data.pagination || {
                total: 0,
                limit: 10,
                offset: 0,
                hasMore: false
              }
            }
          };
        } else if (nestedHasPagination) {
          // Return the nested data object to preserve pagination
          return { ...response, data: nestedData };
        } else {
          // Return unwrapped data for non-paginated responses
          return { ...response, data: nestedData || response.data.data };
        }
      } else {
        // For failed API responses, return the response as is
        // Let the calling function handle the error
        return response;
      }
    }
    // If response doesn't have success field, return as is
    return response;
  },
  (error: AxiosError) => {
    // Extract user-friendly error message
    let errorMessage = 'An error occurred. Please try again.';
    const errorData = error.response?.data as { error?: { message?: string }; message?: string } | undefined;
    
    // Get error message from API response
    if (errorData?.error?.message) {
      errorMessage = errorData.error.message;
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (error.message) {
      // Handle network errors
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    // Show toast notification for errors (except 401 which is handled separately)
    if (error.response?.status !== 401 && typeof window !== 'undefined') {
      // Don't show toast for login errors (they're handled in the form)
      const isLoginError = error.config?.url?.includes('/auth/login');
      // Don't show toast for geocoding errors (they fallback to direct Google API)
      const isGeocodingError = error.config?.url?.includes('/geo/');
      
      if (!isLoginError && !isGeocodingError) {
        toast.error('Error', {
          description: errorMessage,
          duration: 5000,
        });
      }
    }

    // Debug logging for API errors (suppress for geocoding endpoints since fallback is expected)
    const isGeocodingError = error.config?.url?.includes('/geo/');
    if (process.env.NODE_ENV === 'development' && !isGeocodingError) {
      const errorPayload: Record<string, unknown> = {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        requestData: error.config?.data,
        userMessage: errorMessage,
      };

      if (typeof (error as { toJSON?: () => unknown }).toJSON === 'function') {
        try {
          errorPayload.serialized = (error as { toJSON: () => unknown }).toJSON();
        } catch (serializationError) {
          errorPayload.serializationError = (serializationError as Error).message;
        }
      }

      try {
        console.error('API Error payload:', JSON.stringify(errorPayload, null, 2));
      } catch {
        console.error('API Error payload (raw object):', errorPayload);
      }
      console.error('API Error raw:', error);
    }
    
    if (error.response?.status === 401 && error.config) {
      // Handle token refresh on 401
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      const config = error.config as typeof error.config & { _retry?: boolean };
      
      if (refreshToken && !config._retry) {
        config._retry = true;
        return api.post('/auth/refresh', { refreshToken })
          .then((response) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', response.data.tokens.accessToken);
              localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
            }
            if (config.headers) {
              config.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
            }
            return api(config);
          })
          .catch(() => {
            // Refresh failed, redirect to login
            if (typeof window !== 'undefined') {
              localStorage.clear();
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
            return Promise.reject(error);
          });
      } else {
        // No refresh token or already retried, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.clear();
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

