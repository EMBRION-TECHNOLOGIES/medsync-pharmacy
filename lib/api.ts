import axios, { AxiosError } from 'axios';

const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const resolvedBaseUrl =
  envBaseUrl && envBaseUrl.length > 0
    ? envBaseUrl.replace(/\/$/, '')
    : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api/v1'
      : undefined;

if (!resolvedBaseUrl) {
  console.warn(
    '[MedSync] NEXT_PUBLIC_API_BASE_URL is not set. API calls may fail until it is configured.'
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

// Request interceptor for adding Bearer token and idempotency key
api.interceptors.request.use(
  (config) => {
    // Add Bearer token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug logging for API requests
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        hasToken: !!token,
        headers: config.headers,
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
        // Check if response has pagination metadata (check both top-level and nested)
        const hasPagination = 'page' in response.data || 'pageSize' in response.data || 'total' in response.data || 'pagination' in response.data;
        
        if (hasPagination) {
          // Return the whole response.data object to preserve pagination
          return { ...response, data: response.data };
        } else {
          // Return unwrapped data for non-paginated responses
          return { ...response, data: response.data.data };
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
    // Debug logging for API errors
    if (process.env.NODE_ENV === 'development') {
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
      };

      if ((error as any).toJSON) {
        try {
          errorPayload.serialized = (error as any).toJSON();
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
    
    if (error.response?.status === 401) {
      // Handle token refresh on 401
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        return api.post('/auth/refresh', { refreshToken })
          .then((response) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', response.data.tokens.accessToken);
              localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
            }
            error.config.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
            return api(error.config);
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

