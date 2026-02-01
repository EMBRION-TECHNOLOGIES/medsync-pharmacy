import { api } from '@/lib/api';
import { Pharmacy, Location, PharmacyUser, UserRole } from '@/lib/zod-schemas';
import type { PharmacyRoleType, GovernanceStatus } from '@/features/onboarding/types';
import type { Permissions } from '@/lib/permissions';

// Approval mode type (mirrors backend)
type ApprovalMode = 'PRODUCTION' | 'TEST';

// Operational status from backend (single source of truth)
interface OperationalStatus {
  canOperate: boolean;
  governanceStatus: GovernanceStatus;
  adminApproved: boolean;
  approvalMode: ApprovalMode;
  isTestMode: boolean;
  reasons: string[];
  requirements: {
    hasSuperintendent: boolean;
    superintendentCount: number;
    hasLocations: boolean;
    locationCount: number;
    hasActiveLocationsWithSupervisors: boolean;
    locationsWithSupervisorCount: number;
    locationsWithoutSupervisorCount: number;
  };
}

// Dashboard data response
export interface DashboardData {
  pharmacy: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    email?: string;
    status?: string;
    verificationStatus?: string;
    isActive?: boolean;
    logoUrl?: string;
  };
  locations: Array<{ id: string; name: string; address: string }>;
  stats: {
    staffCount: number;
    locationsCount: number;
    orders: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    orderStatus: {
      pending: number;
      confirmed: number;
      inTransit: number;
      delivered: number;
    };
    dispatches: {
      active: number;
      completedThisMonth: number;
    };
    revenue: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      avgOrderValue: number;
    };
  };
  recentOrders: Array<{
    id: string;
    orderCode: string;
    drugName: string;
    status: string;
    amount: number;
    paymentStatus: string;
    createdAt: string;
    patient: {
      id: string;
      name: string;
      medSyncId?: string;
    } | null;
  }>;
  topMedications: Array<{
    name: string;
    count: number;
  }>;
  currentLocation: string | null;
}

// Full pharmacy profile response from /my-pharmacy endpoint
export interface PharmacyProfileResponse {
  pharmacy: Pharmacy & {
    governanceStatus?: GovernanceStatus;
    approvalMode?: ApprovalMode;
  };
  pharmacyUser?: {
    roleType?: PharmacyRoleType;
    permissions?: Permissions;
  };
  operationalStatus?: OperationalStatus;
  role?: string; // Legacy field
}

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

  /**
   * Get the current user's pharmacy profile with operational status
   * 
   * Returns the FULL response including:
   * - pharmacy: The pharmacy object
   * - pharmacyUser: The user's role and permissions
   * - operationalStatus: Authoritative canOperate from backend
   */
  async getPharmacyProfile(): Promise<PharmacyProfileResponse | null> {
    try {
      console.log('🚀 CALLING /pharmacy-management/my-pharmacy API...');
      const response = await api.get('/pharmacy-management/my-pharmacy');
      
      // Backend returns: { success: true, data: { pharmacy, pharmacyUser, operationalStatus, role } }
      // The API interceptor unwraps to response.data
      const responseData = response.data;
      
      console.log('🔍 Pharmacy Profile API Response:', {
        hasPharmacy: !!responseData?.pharmacy,
        pharmacyId: responseData?.pharmacy?.id,
        pharmacyName: responseData?.pharmacy?.name,
        hasOperationalStatus: !!responseData?.operationalStatus,
        canOperate: responseData?.operationalStatus?.canOperate,
        governanceStatus: responseData?.operationalStatus?.governanceStatus,
        roleType: responseData?.pharmacyUser?.roleType,
        fullOpStatus: responseData?.operationalStatus,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service.ts:getPharmacyProfile',message:'API response received',data:{pharmacyId:responseData?.pharmacy?.id,canOperate:responseData?.operationalStatus?.canOperate,governanceStatus:responseData?.operationalStatus?.governanceStatus,adminApproved:responseData?.operationalStatus?.adminApproved,reasons:responseData?.operationalStatus?.reasons,requirements:responseData?.operationalStatus?.requirements},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H-API'})}).catch(()=>{});
      // #endregion
      
      // Return null if no pharmacy
      if (!responseData?.pharmacy) {
        console.log('🔍 No pharmacy found - returning null');
        return null;
      }
      
      // Return the full response structure
      return {
        pharmacy: responseData.pharmacy,
        pharmacyUser: responseData.pharmacyUser,
        operationalStatus: responseData.operationalStatus,
        role: responseData.role,
      };
    } catch (error: any) {
      console.error('❌ Pharmacy Profile API Error:', error?.message);
      
      // If 404, user has no pharmacy
      if (error?.response?.status === 404) {
        console.log('🔍 404 Error - returning null');
        return null;
      }
      
      // Re-throw other errors
      throw error;
    }
  },

  async updatePharmacyProfile(data: Partial<Pharmacy>): Promise<Pharmacy> {
    const response = await api.patch('/pharmacy-management/my-pharmacy', data);
    return response.data.pharmacy;
  },

  /**
   * Get comprehensive dashboard data for pharmacy
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/pharmacy/dashboard');
    return response.data;
  },

  async getLocations(pharmacyId: string): Promise<Location[]> {
    // ✅ FIX: Try branches endpoint first, fallback to locations endpoint
    try {
      const response = await api.get(`/pharmacy-management/pharmacies/${pharmacyId}/branches`);
      return response.data?.branches || response.data?.data || [];
    } catch (error) {
      // Fallback to locations endpoint
      try {
        const response = await api.get(`/pharmacy-management/pharmacies/${pharmacyId}/locations`);
        return response.data?.data || response.data || [];
      } catch (fallbackError) {
        console.error('Failed to fetch locations:', fallbackError);
        return [];
      }
    }
  },

  async createLocation(pharmacyId: string, data: {
    name: string;
    address: string;
    city?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    openingTime?: string;
    closingTime?: string;
    supervisor: {
      // For new supervisor
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      password?: string;
      licenseNumber?: string;
      // For existing supervisor
      userId?: string;
    };
  }): Promise<{ branch: Location; supervisor: { id: string; email: string; isNewUser: boolean }; credentials?: { email: string; password: string } }> {
    const response = await api.post(`/pharmacy-management/pharmacies/${pharmacyId}/branches`, data);
    return response.data;
  },

  async updateLocation(pharmacyId: string, locationId: string, data: Partial<Location>): Promise<Location> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${pharmacyId}/branches/${locationId}`, data);
    return response.data.branch;
  },

  async deleteLocation(pharmacyId: string, locationId: string): Promise<void> {
    await api.delete(`/pharmacy-management/pharmacies/${pharmacyId}/branches/${locationId}`);
  },

  async getStaff(pharmacyId: string): Promise<PharmacyUser[]> {
    // Use onboarding team endpoint which returns all pharmacy users with roleType
    const response = await api.get(`/onboarding/pharmacy/${pharmacyId}/team`);
    return response.data.team || [];
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

  // inviteStaff method removed - use instant user creation endpoint instead
  // POST /pharmacy-management/pharmacies/:pharmacyId/users

  async updateUserRole(pharmacyId: string, userId: string, role: string): Promise<any> {
    const response = await api.patch(`/pharmacy-management/pharmacies/${pharmacyId}/pharmacists/${userId}`, { role });
    return response.data;
  },
};

