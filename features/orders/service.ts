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
  createdAt?: string;
  updatedAt: string;
  traceId?: string;
  // Order items
  drugName?: string;
  dosageSig?: string;
  quantity?: number;
  priceNgn?: number;
  items?: Array<{
    drugName: string;
    dosageSig?: string;
    quantity: number;
    priceNgn: number;
  }>;
  // Patient/recipient info
  patientId?: string;
  patientMsid?: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryAddress?: string;
  // Dispatch
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
      console.log('🔍 /orders API response:', response.data);
      const orders = response.data.data || response.data;
      console.log('🔍 Raw orders array:', orders);
      if (orders.length > 0) {
        console.log('🔍 First order raw data:', orders[0]);
        console.log('🔍 First order patient data:', orders[0].patient);
        console.log('🔍 First order patientMsid:', orders[0].patientMsid);
      }
      
      // Map each order from backend format to OrderDTO
      const mappedOrders = Array.isArray(orders) ? orders.map((order: any) => {
        console.log('🔍 Mapping order:', order.id, 'patientMsid:', order.patientMsid, 'patient:', order.patient);
        return {
        orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.orderStatus || order.status, // Backend might return either field
        paymentStatus: order.paymentStatus || 'Pending',
        dispatchStatus: order.dispatch?.status,
        isReadyForDispatch: order.isReadyForDispatch || false,
        updatedAt: order.updatedAt,
        createdAt: order.createdAt,
        drugName: order.drugName,
        quantity: order.quantity,
        priceNgn: order.priceNgn,
        items: order.items, // ✅ Map items array
        patientId: order.patientId,
        patientMsid: order.patientMsid || order.patient?.medSyncId, // ✅ Map patient MedSync ID
      };
      }) : [];
      
      return {
        data: mappedOrders,
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 10,
        total: response.data.total || 0,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback to chat-orders
        console.log('🔍 /orders failed, falling back to /chat-orders');
        const response = await api.get(`/chat-orders?${params}`);
        console.log('🔍 /chat-orders API response:', response.data);
        const orders = response.data.orders || response.data.data || [];
        
        // Map chat-orders response to unified shape
        const mappedOrders = Array.isArray(orders) ? orders.map((order: any) => ({
          orderId: order.id,
          orderCode: order.orderCode,
          orderStatus: order.orderStatus || order.status, // Backend might return either field
          paymentStatus: order.paymentStatus || 'Pending',
          dispatchStatus: order.dispatch?.status,
          isReadyForDispatch: order.isReadyForDispatch || false,
          updatedAt: order.updatedAt,
          events: order.events || [],
          items: order.items, // ✅ Map items array
          patientId: order.patientId,
          patientMsid: order.patientMsid || order.patient?.medSyncId, // ✅ Map patient MedSync ID
        })) : [];
        
        return {
          data: mappedOrders,
          page: response.data.page || 1,
          pageSize: response.data.limit || response.data.pageSize || 10,
          total: response.data.total || 0,
        };
      }
      throw error;
    }
  },

  async getOrderUnified(id: string): Promise<OrderDTO> {
    try {
      const response = await api.get(`/orders/${id}`);
      
      // Axios interceptor unwraps { success, data } → data
      // So response.data is already the order object
      const order = response.data;
      
      console.log('🔍 Order object after interceptor:', {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        allFields: Object.keys(order)
      });
      
      // Map backend response to OrderDTO
      return {
        orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.orderStatus, // Backend returns orderStatus
        paymentStatus: order.paymentStatus || 'Pending',
        dispatchStatus: order.dispatch?.status,
        isReadyForDispatch: order.isReadyForDispatch || false,
        isConfirmed: order.isConfirmed,
        confirmedAt: order.confirmedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        drugName: order.drugName,
        dosageSig: order.dosageSig,
        quantity: order.quantity,
        priceNgn: order.priceNgn,
        items: order.items, // ✅ ADD: Map items array
        patientId: order.patientId,
        patientMsid: order.patient?.medSyncId,
        receiverName: order.deliveryAddress?.contactName,
        receiverPhone: order.deliveryAddress?.contactPhone,
        deliveryAddress: order.deliveryAddress?.address,
        dispatch: order.dispatch ? {
          id: order.dispatch.id,
          provider: order.dispatch.provider,
          trackingNumber: order.dispatch.trackingNumber,
          trackingUrl: order.dispatch.trackingUrl,
          eta: order.dispatch.estimatedArrival,
        } : undefined,
        events: order.timeline || order.events || [],
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback to chat-orders
        const response = await api.get(`/chat-orders/${id}`);
        const order = response.data.order || response.data.data?.order || response.data.data;
        return {
          orderId: order.id,
          orderCode: order.orderCode,
          orderStatus: order.orderStatus || order.status, // Backend might return either field
          paymentStatus: order.paymentStatus || 'Pending',
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
      console.log('🚀 Calling dispense endpoint for order:', id);
      
      // Use dispense endpoint to mark order as PREPARED (ready for payment)
        const response = await api.post(`/chat-orders/${id}/dispense`, {});
      
      // Debug: Log the FULL response structure
      console.log('🔍 Full dispense response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        dataType: typeof response.data,
        isNull: response.data === null,
        isUndefined: response.data === undefined,
        keys: response.data ? Object.keys(response.data) : 'NO DATA'
      });
      
      // Axios interceptor unwraps { success, data } → data
      // But the dispense endpoint might return { success, data: { order } }
      const order = response.data?.order || response.data;
      
      console.log('🔍 Extracted order:', {
        order,
        hasId: !!order?.id,
        id: order?.id,
        status: order?.status
      });
      
      if (!order || !order.id) {
        throw new Error('Invalid response from dispense endpoint - no order data');
      }
      
        return {
          orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.status || order.orderStatus,
        paymentStatus: order.paymentStatus || 'Pending',
          dispatchStatus: order.dispatch?.status,
          isReadyForDispatch: true,
          updatedAt: order.updatedAt,
        createdAt: order.createdAt,
        drugName: order.drugName,
        quantity: order.quantity,
        priceNgn: order.priceNgn,
          events: order.events || [],
        };
    } catch (error: any) {
      console.error('❌ Error marking order as prepared:', error);
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

  async cancelDispatch(orderId: string): Promise<OrderDTO> {
    const response = await api.post(`/orders/${orderId}/cancel-dispatch`, {});
    return response.data as OrderDTO;
  },
};

