import { api } from '@/lib/api';
import { Dispatch, DispatchProvider, DispatchStatus } from '@/lib/zod-schemas';

export interface EmergencyDispatchRequest {
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  symptoms?: string[];
  patientInfo?: {
    age?: number;
    gender?: string;
    medicalHistory?: string[];
    allergies?: string[];
  };
  contactInfo: {
    phone: string;
    name: string;
  };
}

export interface BookDeliveryRequest {
  orderId: string;
  pharmacyId: string;
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
    contactName: string;
    contactPhone: string;
  };
  vehicleType?: 'bike' | 'van' | 'auto';
  specialInstructions?: string;
  scheduledTime?: string;
}

export interface DeliveryQuoteRequest {
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleType?: 'bike' | 'van' | 'auto';
  packageWeight?: number;
  packageValue?: number;
}

export const dispatchService = {
  async createEmergencyDispatch(data: EmergencyDispatchRequest): Promise<any> {
    const response = await api.post('/dispatch/emergency', data);
    return response.data;
  },

  async getDispatchRequests(filters: {
    status?: DispatchStatus;
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/dispatch/requests?${params}`);
    return response.data;
  },

  async getDispatchRequest(requestId: string): Promise<any> {
    const response = await api.get(`/dispatch/requests/${requestId}`);
    return response.data;
  },

  async getAvailableProviders(location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    
    if (location) {
      params.append('latitude', location.latitude.toString());
      params.append('longitude', location.longitude.toString());
      if (location.radius) {
        params.append('radius', location.radius.toString());
      }
    }

    const response = await api.get(`/dispatch/available-providers?${params}`);
    return response.data;
  },

  async assignProvider(requestId: string, providerId: string): Promise<any> {
    const response = await api.patch(`/dispatch/requests/${requestId}/assign`, { providerId });
    return response.data;
  },

  async updateDispatchStatus(requestId: string, status: DispatchStatus, notes?: string): Promise<any> {
    const response = await api.patch(`/dispatch/requests/${requestId}/status`, { status, notes });
    return response.data;
  },

  async cancelDispatchRequest(requestId: string, reason: string): Promise<any> {
    const response = await api.post(`/dispatch/requests/${requestId}/cancel`, { reason });
    return response.data;
  },

  async bookDelivery(data: BookDeliveryRequest): Promise<any> {
    const response = await api.post('/dispatch/book', data);
    return response.data;
  },

  async getDeliveryQuote(data: DeliveryQuoteRequest): Promise<any> {
    const response = await api.post('/dispatch/quote', data);
    return response.data;
  },

  async trackDelivery(dispatchId: string): Promise<Dispatch> {
    const response = await api.get(`/dispatch/${dispatchId}`);
    return response.data;
  },

  async getDeliveryHistory(filters: {
    status?: DispatchStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/dispatch/history?${params}`);

    return response.data;
  },

  async cancelDelivery(dispatchId: string, reason: string): Promise<any> {
    const response = await api.post(`/dispatch/${dispatchId}/cancel`, { reason });
    return response.data;
  },

  // Kwik integration endpoints
  async getKwikQuote(data: any): Promise<any> {
    const response = await api.post('/kwik/v2/quote', data);
    return response.data;
  },

  async bookKwikDelivery(data: any): Promise<any> {
    const response = await api.post('/kwik/v2/book', data);
    return response.data;
  },

  async trackKwikDelivery(dispatchId: string): Promise<any> {
    const response = await api.get(`/kwik/v2/track/${dispatchId}`);
    return response.data;
  },

  async cancelKwikDelivery(data: any): Promise<any> {
    const response = await api.post('/kwik/v2/cancel', data);
    return response.data;
  },
};

