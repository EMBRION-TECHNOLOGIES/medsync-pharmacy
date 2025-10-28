import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/lib/zod-schemas';

export interface OrderFilters {
  status?: OrderStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Unified OrderDTO shape from backend for /api/v1/orders
export interface OrderEventDTO {
  type: string;
  at: string;
}

export type DispatchStatusNormalized =
  | 'BOOKED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELED';

export interface OrderDTO {
  orderId: string;
  orderCode?: string;
  orderStatus: string;
  paymentStatus: string;
  dispatchStatus?: DispatchStatusNormalized;
  isReadyForDispatch?: boolean;
  isConfirmed?: boolean;
  confirmedAt?: string;
  updatedAt: string;
  traceId?: string;
  dispatch?: {
    id: string;
    provider: string;
    trackingNumber?: string;
    trackingUrl?: string;
    eta?: string;
  };
  events?: OrderEventDTO[];
}

export interface UnifiedOrdersResponse {
  data: OrderDTO[];
  page: number;
  pageSize: number;
  total: number;
}

export const ordersService = {
  async getOrders(filters: OrderFilters = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/chat-orders?${params}`);
    // The backend now returns both orders and rooms in a single response
    return {
      orders: response.data.orders || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 10,
      totalPages: response.data.totalPages || 1,
    };
  },

  // Unified endpoints (fallback to chat-orders for now)
  async getOrdersUnified(filters: OrderFilters = {}): Promise<UnifiedOrdersResponse> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', String(filters.status));
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);

    // Try /orders first, fallback to /chat-orders
    try {
      const response = await api.get(`/orders?${params}`);
      return response.data as UnifiedOrdersResponse;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback to chat-orders
        const response = await api.get(`/chat-orders?${params}`);
        // Map chat-orders response to unified shape
        return {
          data: response.data.orders || [],
          page: response.data.page || 1,
          pageSize: response.data.limit || 10,
          total: response.data.total || 0,
        };
      }
      throw error;
    }
  },

  async getOrderUnified(id: string): Promise<OrderDTO> {
    try {
      const response = await api.get(`/orders/${id}`);
      return response.data as OrderDTO;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback to chat-orders
        const response = await api.get(`/chat-orders/${id}`);
        // Map to OrderDTO shape
        const order = response.data.order;
        return {
          orderId: order.id,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus || 'Unknown',
          dispatchStatus: order.dispatch?.status,
          isReadyForDispatch: order.isReadyForDispatch || false,
          updatedAt: order.updatedAt,
          events: order.events || [],
          dispatch: order.dispatch ? {
            id: order.dispatch.id,
            provider: order.dispatch.provider,
            trackingNumber: order.dispatch.trackingNumber,
            trackingUrl: order.dispatch.trackingUrl,
            eta: order.dispatch.estimatedArrival,
          } : undefined,
        };
      }
      throw error;
    }
  },

  async markOrderReady(id: string): Promise<OrderDTO> {
    try {
      const response = await api.post(`/orders/${id}/ready`, {});
      return response.data as OrderDTO;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback: use dispense endpoint
        const response = await api.post(`/chat-orders/${id}/dispense`, {});
        // Map response to OrderDTO
        const order = response.data.order;
        return {
          orderId: order.id,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus || 'Unknown',
          dispatchStatus: order.dispatch?.status,
          isReadyForDispatch: true,
          updatedAt: order.updatedAt,
          events: order.events || [],
        };
      }
      throw error;
    }
  },

  async verifyDispatchOtp(dispatchId: string, code: string): Promise<{ success: boolean } & Partial<OrderDTO>> {
    const response = await api.post(`/dispatch/${dispatchId}/otp/verify`, { code });
    return response.data;
  },

  async createOrder(roomId: string, orderData: {
    drugName?: string;
    quantity?: number;
    dosageSig?: string;
    priceNgn?: number;
    items?: Array<{
      drugName: string;
      quantity: number;
      dosageSig?: string;
      priceNgn: number;
    }>;
  }): Promise<Order> {
    const response = await api.post(`/chat-orders/${roomId}/order`, orderData);
    return response.data;
  },


  async getOrder(id: string): Promise<Order> {
    const response = await api.get(`/chat-orders/${id}`);
    return response.data.order;
  },

  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
    const response = await api.patch(`/chat-orders/${id}/status`, { status, notes });
    return response.data.order;
  },

  async dispenseOrder(id: string, notes?: string): Promise<Order> {
    const response = await api.post(`/chat-orders/${id}/dispense`, { notes });
    return response.data.order;
  },

  async cancelOrder(id: string, reason: string): Promise<Order> {
    const response = await api.post(`/chat-orders/${id}/cancel`, { reason });
    return response.data.order;
  },

  async getUserOrders(filters: OrderFilters = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/chat-orders?${params}`);
    return response.data;
  },

  async getChatRoomOrders(roomId: string): Promise<Order[]> {
    const response = await api.get(`/chat-orders/room/${roomId}`);
    return response.data.orders;
  },
};

