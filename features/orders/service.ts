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

export interface OrderItem {
  drugName: string;
  dosageSig?: string;
  quantity: number;
  unit?: string; // e.g. "packs", "tablets", "cards", "bottles"
  priceNgn: number;
  drugId?: string;
}

export interface OrderDispatch {
  id: string;
  provider: string;
  trackingNumber?: string;
  trackingUrl?: string;
  eta?: string;
  otp?: string;
}

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
  items?: OrderItem[];
  // Patient/recipient info
  patientId?: string;
  patientMsid?: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  // Dispatch
  dispatch?: OrderDispatch;
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

      // Backend order type definition
      interface BackendOrder {
        id: string;
        orderCode?: string;
        orderStatus?: string;
        status?: string;
        paymentStatus?: string;
        dispatch?: { status?: DispatchStatusNormalized };
        isReadyForDispatch?: boolean;
        updatedAt: string;
        createdAt?: string;
        drugName?: string;
        quantity?: number;
        priceNgn?: number;
        items?: OrderItem[];
        patientId?: string;
        patientMsid?: string;
        patient?: { medSyncId?: string };
        events?: OrderEventDTO[];
      }

    // Try /orders first, fallback to /chat-orders
    try {
      const response = await api.get(`/orders?${params}`);
      console.log('🔍 /orders API response:', response.data);
      
      // Handle both response formats:
      // 1. Interceptor unwrapped: { data: [...], page, pageSize, total }
      // 2. Raw array: [...]
      const responseData = response.data;
      const orders = Array.isArray(responseData) ? responseData : (responseData.data || []);
      const page = responseData.page || 1;
      const pageSize = responseData.pageSize || 15;
      const total = responseData.total || orders.length;
      
      console.log('🔍 Parsed response:', { ordersCount: orders.length, page, pageSize, total });
      
      if (orders.length > 0) {
        console.log('🔍 First order raw data:', orders[0]);
        console.log('🔍 First order patientMsid:', orders[0].patientMsid);
      }
      
      // Map each order from backend format to OrderDTO
      const mappedOrders = Array.isArray(orders) ? orders.map((order: BackendOrder): OrderDTO => {
        return {
        orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.orderStatus || order.status || 'PENDING', // Backend might return either field
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
        page,
        pageSize,
        total,
      };
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 403) {
        return {
          data: [],
          page: filters.page || 1,
          pageSize: filters.limit || 10,
          total: 0,
        };
      }

      if (apiError.response?.status === 404) {
        // Fallback to chat-orders
        console.log('🔍 /orders failed, falling back to /chat-orders');
        const response = await api.get(`/chat-orders?${params}`);
        console.log('🔍 /chat-orders API response:', response.data);
        const orders = response.data.orders || response.data.data || [];
        
        // Map chat-orders response to unified shape
        const mappedOrders = Array.isArray(orders) ? orders.map((order: BackendOrder): OrderDTO => ({
          orderId: order.id,
          orderCode: order.orderCode,
          orderStatus: order.orderStatus || order.status || 'PENDING', // Backend might return either field
          paymentStatus: order.paymentStatus || 'Pending',
          dispatchStatus: order.dispatch?.status,
          isReadyForDispatch: order.isReadyForDispatch || false,
          createdAt: order.createdAt ?? order.updatedAt,
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
    // Backend order response type definition
    interface BackendOrderResponse {
      id: string;
      orderCode?: string;
      orderStatus?: string;
      paymentStatus?: string;
      dispatch?: OrderDispatch & { status?: DispatchStatusNormalized; estimatedArrival?: string };
      isReadyForDispatch?: boolean;
      isConfirmed?: boolean;
      confirmedAt?: string;
      createdAt?: string;
      updatedAt: string;
      drugName?: string;
      dosageSig?: string;
      quantity?: number;
      priceNgn?: number;
      items?: OrderItem[];
      patientId?: string;
      patientMsid?: string;
      patient?: { medSyncId?: string };
      receiverName?: string;
      receiverPhone?: string;
      deliveryAddress?: string | { address?: string; contactName?: string; contactPhone?: string };
      deliveryLat?: number;
      deliveryLng?: number;
      timeline?: OrderEventDTO[];
      events?: OrderEventDTO[];
    }

    try {
      const response = await api.get(`/orders/${id}`);
      
      // Axios interceptor unwraps { success, data } → data
      // So response.data is already the order object
      const order = response.data as BackendOrderResponse;
      
      console.log('🔍 Order object after interceptor:', {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        patientMsid: order.patientMsid,
        patientId: order.patientId,
        patient: order.patient,
        receiverName: order.receiverName,
        allFields: Object.keys(order)
      });
      
      // Map backend response to OrderDTO
      const mapped: OrderDTO = {
        orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.orderStatus || 'PENDING', // Backend returns orderStatus
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
        patientMsid: order.patientMsid || order.patient?.medSyncId || undefined, // Backend returns patientMsid directly
        receiverName: order.receiverName || (typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null ? order.deliveryAddress.contactName : undefined), // NOTE: Should NOT be displayed to pharmacy
        receiverPhone: order.receiverPhone || (typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null ? order.deliveryAddress.contactPhone : undefined), // Backend returns receiverPhone directly
        deliveryAddress: typeof order.deliveryAddress === 'string' ? order.deliveryAddress : (typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null ? order.deliveryAddress.address : undefined),
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng,
        dispatch: order.dispatch ? {
          id: order.dispatch.id,
          provider: order.dispatch.provider,
          trackingNumber: order.dispatch.trackingNumber,
          trackingUrl: order.dispatch.trackingUrl,
          eta: order.dispatch.eta || order.dispatch.estimatedArrival,
        } : undefined,
        events: order.timeline || order.events || [],
      };
      
      console.log('✅ Mapped order DTO:', {
        orderId: mapped.orderId,
        patientMsid: mapped.patientMsid,
        hasReceiverName: !!mapped.receiverName,
        receiverName: mapped.receiverName // Log but should NOT be displayed
      });
      
      return mapped;
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        // Fallback to chat-orders
        const response = await api.get(`/chat-orders/${id}`);
        const order = (response.data?.order || response.data?.data?.order || response.data) as BackendOrderResponse;
        const rawOrder = order && typeof order === 'object' ? order : (response.data as any);
        return {
          orderId: rawOrder?.id || order?.id,
          orderCode: rawOrder?.orderCode ?? order?.orderCode,
          orderStatus: (rawOrder?.orderStatus ?? rawOrder?.status ?? order?.orderStatus ?? order?.status ?? 'PENDING') as string,
          paymentStatus: rawOrder?.paymentStatus ?? order?.paymentStatus ?? 'Pending',
          dispatchStatus: rawOrder?.dispatch?.status ?? order?.dispatch?.status,
          isReadyForDispatch: rawOrder?.isReadyForDispatch ?? order?.isReadyForDispatch ?? false,
          createdAt: rawOrder?.createdAt ?? order?.createdAt ?? rawOrder?.updatedAt ?? order?.updatedAt,
          updatedAt: rawOrder?.updatedAt ?? order?.updatedAt ?? new Date().toISOString(),
          events: rawOrder?.events ?? order?.events ?? [],
          items: rawOrder?.items ?? order?.items,
          patientMsid: rawOrder?.patientMsid ?? rawOrder?.patient?.medSyncId ?? order?.patientMsid ?? order?.patient?.medSyncId ?? undefined,
          dispatch: (rawOrder?.dispatch || order?.dispatch) ? {
            id: (rawOrder?.dispatch || order?.dispatch).id,
            provider: (rawOrder?.dispatch || order?.dispatch).provider,
            trackingNumber: (rawOrder?.dispatch || order?.dispatch).trackingNumber,
            trackingUrl: (rawOrder?.dispatch || order?.dispatch).trackingUrl,
            eta: (rawOrder?.dispatch || order?.dispatch).eta ?? (rawOrder?.dispatch || order?.dispatch).estimatedArrival,
          } : undefined,
          deliveryAddress: rawOrder?.deliveryAddress ?? order?.deliveryAddress,
          deliveryLat: rawOrder?.deliveryLat ?? order?.deliveryLat,
          deliveryLng: rawOrder?.deliveryLng ?? order?.deliveryLng,
        } as OrderDTO;
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
      
        interface DispenseOrderResponse {
          id: string;
          orderCode?: string;
          status?: string;
          orderStatus?: string;
          paymentStatus?: string;
          dispatch?: { status?: DispatchStatusNormalized };
          updatedAt: string;
          createdAt?: string;
          drugName?: string;
          quantity?: number;
          priceNgn?: number;
          events?: OrderEventDTO[];
        }

        const dispenseOrder = order as DispenseOrderResponse;

        return {
          orderId: dispenseOrder.id,
          orderCode: dispenseOrder.orderCode,
          orderStatus: dispenseOrder.status || dispenseOrder.orderStatus || 'PREPARED',
          paymentStatus: dispenseOrder.paymentStatus || 'Pending',
          dispatchStatus: dispenseOrder.dispatch?.status,
          isReadyForDispatch: true,
          updatedAt: dispenseOrder.updatedAt,
          createdAt: dispenseOrder.createdAt,
          drugName: dispenseOrder.drugName,
          quantity: dispenseOrder.quantity,
          priceNgn: dispenseOrder.priceNgn,
          events: dispenseOrder.events || [],
        } as OrderDTO;
    } catch (error: unknown) {
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
    // API interceptor unwraps { success: true, data: order } to just the order object
    return response.data;
  },

  async dispenseOrder(id: string, notes?: string): Promise<Order> {
    const response = await api.post(`/chat-orders/${id}/dispense`, { notes });
    // API interceptor unwraps { success: true, data: order } to just the order object
    return response.data;
  },

  async cancelOrder(id: string, reason: string): Promise<Order> {
    const response = await api.post(`/chat-orders/${id}/cancel`, { reason });
    // API interceptor unwraps { success: true, data: order } to just the order object
    return response.data;
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

  async bookDispatch(orderId: string, deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  }): Promise<OrderDTO> {
    try {
      console.log('🚚 Booking dispatch for order:', orderId);
      
      // Use simple dispatch route which gets pharmacy ID from order
      const response = await api.post('/dispatch/book', {
        orderId,
        deliveryAddress,
      });
      
      console.log('✅ Dispatch booked:', response.data);
      
      // Reload order to get updated dispatch status
      return await this.getOrderUnified(orderId);
    } catch (error: unknown) {
      console.error('❌ Error booking dispatch:', error);
      throw error;
    }
  },

  /** Start dispatch lifecycle simulation (dev/staging only). Status updates every 30s. */
  async startDispatchSimulation(orderId: string): Promise<{ success: boolean; dispatchId?: string; message: string }> {
    const response = await api.post<{ success: boolean; data?: { dispatchId?: string }; message: string }>(
      '/dispatch/simulate',
      { orderId }
    );
    return {
      success: response.data.success,
      dispatchId: response.data.data?.dispatchId,
      message: response.data.message ?? (response.data.success ? 'Simulation started' : 'Failed'),
    };
  },

  /** Reset dispatch simulation: roll back order, remove simulated dispatch and chat messages. */
  async resetDispatchSimulation(params: { orderId?: string; dispatchId?: string }): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      '/dispatch/simulate/reset',
      params
    );
    return { success: response.data.success, message: response.data.message ?? '' };
  },
};

