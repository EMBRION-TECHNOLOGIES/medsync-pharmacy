import { api } from '@/lib/api';

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
  createdAt?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
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
    return response.data as AdminPharmacyListResponse;
  },

  async getEvents(pharmacyId: string): Promise<VerificationEvent[]> {
    const response = await api.get(`/admin/pharmacies/${pharmacyId}/events`);
    return response.data?.data ?? response.data ?? [];
  },

  async updateStatus(pharmacyId: string, status: 'pending' | 'approved' | 'rejected', notes?: string) {
    const response = await api.patch(`/admin/pharmacies/${pharmacyId}/status`, {
      status,
      notes,
    });
    return response.data;
  },
};



