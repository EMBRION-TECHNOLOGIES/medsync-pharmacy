import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
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
        // Return unwrapped data for successful responses
        return { ...response, data: response.data.data };
      } else {
        // For failed API responses, return the response as is
        // Let the calling function handle the error
        return response;
      }
    }
    // If response doesn't have success field, return as is
    return response;
  },
  (error) => {
    // Debug logging for API errors
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        requestData: error.config?.data
      });
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

