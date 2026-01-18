import { api } from '@/lib/api';

export interface AdminVerificationItem {
  verified: boolean;
  verifiedAt: string | null;
}

export interface AdminPharmacyRecord {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  verificationStatus: string;
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  governanceStatus?: string | null;
  adminApproved?: boolean;
  createdAt?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  licenses?: {
    pcnRegistrationNumber: string | null;
    cacRegistrationNumber: string | null;
    cacBusinessName: string | null;
    nafdacLicenseNo: string | null;
    premisesLicense: string | null;
  };
  adminVerification?: {
    pcnLicense: AdminVerificationItem;
    cacCertificate: AdminVerificationItem;
    superintendentLicense: AdminVerificationItem;
    premisesLicense: AdminVerificationItem;
    nafdacLicense: AdminVerificationItem;
    namesMatch: AdminVerificationItem;
  };
  governance?: {
    hasSuperintendent: boolean;
    superintendentCount: number;
    hasLocations: boolean;
    locationCount: number;
    teamCount: number;
    canBeApproved: boolean;
    // Operational warnings (not blockers)
    locationsWithoutSupervisor: number;
    hasLocationWarnings: boolean;
  };
  approvalMode?: 'PRODUCTION' | 'TEST';
}

export interface AdminPharmacyListResponse {
  data: AdminPharmacyRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface VerificationEvent {
  id: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

export const pharmacyVerificationService = {
  async listPharmacies(params: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AdminPharmacyListResponse> {
    const query = new URLSearchParams();

    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());

    const response = await api.get(`/admin/pharmacies${query.toString() ? `?${query.toString()}` : ''}`);

    // ✅ FIX: The API interceptor already unwraps the response
    // Backend returns: { success: true, data: { pharmacies, total, limit, offset } }
    // Interceptor returns: response.data = { pharmacies, total, limit, offset }
    const backendData = response.data;

    if (!backendData || !backendData.pharmacies) {
      console.error('❌ Invalid API response structure:', response.data);
      throw new Error('Invalid API response structure');
    }

    // Backend already returns owner field directly, no need to transform
    // The backend endpoint formats the response with owner already set
    const pharmacies = (backendData.pharmacies || []).map((pharmacy: any) => ({
      ...pharmacy,
      // owner is already set by backend, but ensure it's properly structured
      owner: pharmacy.owner || null
    }));

    const transformedResponse: AdminPharmacyListResponse = {
      data: pharmacies,
      pagination: {
        total: backendData.total || 0,
        limit: backendData.limit || params.limit || 10,
        offset: backendData.offset || 0,
        hasMore: (backendData.offset || 0) + (backendData.pharmacies?.length || 0) < (backendData.total || 0)
      }
    };

    console.log('✅ [PharmacyVerification] Transformed response:', {
      pharmaciesCount: transformedResponse.data.length,
      total: transformedResponse.pagination.total,
      hasMore: transformedResponse.pagination.hasMore
    });

    return transformedResponse;
  },

  async getEvents(pharmacyId: string): Promise<VerificationEvent[]> {
    console.log('🔍 Fetching pharmacy events:', { pharmacyId });

    // Check if we have an auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    console.log('🔑 Auth status:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...',
      user: user ? JSON.parse(user) : null
    });

    try {
      const response = await api.get(`/admin/pharmacies/${pharmacyId}/events`);
      console.log('✅ Events fetched successfully:', response.data);
      return response.data?.data ?? response.data ?? [];
    } catch (error: any) {
      console.error('❌ Failed to fetch events:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  async updateStatus(pharmacyId: string, status: 'pending' | 'approved' | 'rejected', notes?: string) {
    const response = await api.patch(`/admin/pharmacies/${pharmacyId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  async setTestMode(pharmacyId: string, enabled: boolean, notes?: string) {
    const response = await api.patch(`/admin/pharmacies/${pharmacyId}/test-mode`, {
      enabled,
      notes,
    });
    return response.data;
  },

  async updateComplianceItem(pharmacyId: string, item: string, verified: boolean) {
    const response = await api.patch(`/admin/pharmacies/${pharmacyId}/compliance-item`, {
      item,
      verified,
    });
    return response.data;
  },
};



