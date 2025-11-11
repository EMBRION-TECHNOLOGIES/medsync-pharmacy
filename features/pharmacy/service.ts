import { api } from '@/lib/api';
import { Pharmacy, Location, PharmacyUser, UserRole } from '@/lib/zod-schemas';

export const pharmacyService = {
  // Public endpoints (no authentication required)
  async getPharmacy(id: string): Promise<Pharmacy> {
    const response = await api.get(`/pharmacies/${id}`);
    return response.data.pharmacy;
  },

  async getPharmacies(filters: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    // This is a public endpoint - no auth required
    const response = await api.get(`/pharmacies?${params}`);
    return response.data;
  },

  // Protected endpoints (authentication required)
  async createPharmacy(data: {
    name: string;
    address: string;
    phone: string;
    email: string;
    licenseNumber?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
  }): Promise<Pharmacy> {
    const response = await api.post('/pharmacy-management/pharmacies', data);
    return response.data.pharmacy;
  },

  async updatePharmacy(id: string, data: Partial<Pharmacy>): Promise<Pharmacy> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${id}`, data);
    return response.data.pharmacy;
  },

  async verifyPharmacy(id: string): Promise<Pharmacy> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${id}/verify`);
    return response.data.pharmacy;
  },

  async getPharmacyProfile(): Promise<Pharmacy> {
    const response = await api.get('/pharmacy-management/my-pharmacy');
    if (process.env.NODE_ENV === 'development') {
      console.log('Pharmacy Profile API Response:', response.data);
    }
    // Handle both nested and direct response structures
    return response.data.pharmacy || response.data;
  },

  async updatePharmacyProfile(data: Partial<Pharmacy>): Promise<Pharmacy> {
    const response = await api.patch('/pharmacy-management/my-pharmacy', data);
    return response.data.pharmacy;
  },

  async getLocations(pharmacyId: string): Promise<Location[]> {
    const response = await api.get(`/pharmacy-management/pharmacies/${pharmacyId}/branches`);
    return response.data.branches;
  },

  async createLocation(pharmacyId: string, data: {
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    isPrimary?: boolean;
  }): Promise<Location> {
    const response = await api.post(`/pharmacy-management/pharmacies/${pharmacyId}/branches`, data);
    return response.data.branch;
  },

  async updateLocation(pharmacyId: string, locationId: string, data: Partial<Location>): Promise<Location> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${pharmacyId}/branches/${locationId}`, data);
    return response.data.branch;
  },

  async deleteLocation(pharmacyId: string, locationId: string): Promise<void> {
    await api.delete(`/pharmacy-management/pharmacies/${pharmacyId}/branches/${locationId}`);
  },

  async getStaff(pharmacyId: string): Promise<PharmacyUser[]> {
    const response = await api.get(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists`);
    return response.data.pharmacists || [];
  },

  async addPharmacist(pharmacyId: string, data: {
    email: string;
    role?: string;
    permissions?: {
      canDispenseOrders?: boolean;
      canViewInventory?: boolean;
      canManageStaff?: boolean;
      canViewReports?: boolean;
    };
  }): Promise<PharmacyUser> {
    const response = await api.post(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists`, data);
    return response.data;
  },

  async removePharmacist(pharmacyId: string, pharmacistId: string): Promise<void> {
    await api.delete(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists/${pharmacistId}`);
  },

  async getOrders(filters: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/chat-orders?${params}`);
    return response.data;
  },

  async getDashboard(): Promise<any> {
    const response = await api.get('/pharmacy/dashboard');
    return response.data;
  },

  async getActivity(limit: number = 20): Promise<any> {
    const response = await api.get(`/pharmacy/activity?limit=${limit}`);
    return response.data.activities;
  },

  async inviteStaff(pharmacyId: string, data: { email: string; role: string; locationId?: string }): Promise<any> {
    if (!pharmacyId) {
      throw new Error('Pharmacy ID is required to invite staff');
    }
    
    const response = await api.post(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists`, {
      email: data.email,
      role: data.role,
      locationId: data.locationId
    });
    return response.data.data || response.data;
  },

  async updateUserRole(pharmacyId: string, userId: string, role: string): Promise<any> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists/${userId}`, { role });
    return response.data;
  },
};

