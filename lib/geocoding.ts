/**
 * Geocoding Service for Pharmacy Portal
 * Handles Google Places Autocomplete and geocoding
 */

import { api } from './api';

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface NormalizedAddress {
  formattedAddress: string;
  name?: string;
  street?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}

class GeocodingService {
  private sessionToken: string = '';

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get address suggestions from Google Places Autocomplete
   * Uses backend API if authenticated, otherwise falls back to direct Google API
   */
  async getAddressSuggestions(query: string): Promise<{ success: boolean; data?: AddressSuggestion[]; error?: string }> {
    try {
      if (!query || query.length < 3) {
        return { success: true, data: [] };
      }

      // Generate session token if not exists
      if (!this.sessionToken) {
        this.sessionToken = this.generateSessionToken();
      }

      try {
        // Try backend API first (requires auth)
        const response = await api.post('/geo/autocomplete', {
          query,
          sessionToken: this.sessionToken,
        });

        if (response.data.success) {
          return {
            success: true,
            data: response.data.data.suggestions || [],
          };
        }

        return {
          success: false,
          error: response.data.error?.message || 'Failed to get suggestions',
        };
      } catch (_backendError: unknown) {
        // If backend fails (e.g., network error, not authenticated), use Next.js API route
        // This works during signup when user is not authenticated
        try {
          const response = await fetch('/api/places/autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              sessionToken: this.sessionToken,
            }),
          });

          const data = await response.json();

          if (data.success && data.data) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Found ${data.data.suggestions?.length || 0} address suggestions for "${query}"`);
            }
            return {
              success: true,
              data: data.data.suggestions || [],
            };
          }

          return {
            success: false,
            error: data.error?.message || 'Failed to get suggestions',
          };
        } catch (fetchError: unknown) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error calling autocomplete API:', fetchError);
          }
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch address suggestions';
          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    } catch (error: unknown) {
      console.error('Autocomplete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get address suggestions';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get verified address details from place ID
   */
  async getPlaceDetails(placeId: string): Promise<{ success: boolean; data?: NormalizedAddress; error?: string }> {
    try {
      if (!placeId) {
        return {
          success: false,
          error: 'Place ID is required',
        };
      }

      try {
        // Try backend API first
        const response = await api.post('/geo/place-details', {
          placeId,
          sessionToken: this.sessionToken,
        });

        if (response.data.success) {
          return {
            success: true,
            data: response.data.data.address,
          };
        }

        return {
          success: false,
          error: response.data.error?.message || 'Failed to get address details',
        };
      } catch (_backendError: unknown) {
        // If backend fails (e.g., network error, not authenticated), use Next.js API route
        try {
          const response = await fetch('/api/places/details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              placeId,
              sessionToken: this.sessionToken,
            }),
          });

          const data = await response.json();

          if (data.success && data.data) {
            return {
              success: true,
              data: data.data.address,
            };
          }

          return {
            success: false,
            error: data.error?.message || 'Failed to get address details',
          };
        } catch (fetchError: unknown) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to get place details';
          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    } catch (error: unknown) {
      console.error('Place details error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get address details';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Reset session token (call after address is selected)
   */
  resetSessionToken() {
    this.sessionToken = '';
  }
}

export const geocodingService = new GeocodingService();


