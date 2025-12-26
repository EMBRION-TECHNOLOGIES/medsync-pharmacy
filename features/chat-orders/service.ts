import { api } from '@/lib/api';
import { Order, ChatRoom, OrderStatus } from '@/lib/zod-schemas';

export interface ChatOrdersFilters {
  status?: OrderStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface ChatOrdersResponse {
  orders: Order[];
  rooms: ChatRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const chatOrdersService = {
  async getChatOrders(filters: ChatOrdersFilters = {}): Promise<ChatOrdersResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/chat-orders?${params}`);
    
    // The API interceptor now correctly unwraps paginated responses
    // response.data should be the nested data object with orders, rooms, etc.
    const responseData = response.data;
    
    console.log('🔍 Chat Orders API Response:', {
      responseDataKeys: Object.keys(responseData || {}),
      ordersCount: responseData?.orders?.length || 0,
      roomsCount: responseData?.rooms?.length || 0,
      total: responseData?.total,
      sampleOrder: responseData?.orders?.[0] ? {
        id: responseData.orders[0].id,
        status: responseData.orders[0].status,
        orderStatus: responseData.orders[0].orderStatus,
        paymentStatus: responseData.orders[0].paymentStatus,
        priceNgn: responseData.orders[0].priceNgn,
        totalAmount: responseData.orders[0].totalAmount,
        createdAt: responseData.orders[0].createdAt,
      } : null
    });
    
    return {
      orders: responseData?.orders || [],
      rooms: responseData?.rooms || [],
      total: responseData?.total || 0,
      page: responseData?.page || 1,
      limit: responseData?.limit || 10,
      totalPages: responseData?.totalPages || 1,
    };
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

  async getMessages(roomId: string, page: number = 1, limit: number = 50): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await api.get(`/chat-orders/${roomId}/messages?${params}`);
    return {
      messages: response.data.messages || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 10,
      totalPages: response.data.totalPages || 1,
    };
  },

  async sendMessage(roomId: string, content: string, messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'): Promise<any> {
    const payload = { 
      message: content, 
      messageType 
    };
    console.log('Sending message payload:', payload);
    console.log('Sending to endpoint:', `/chat-orders/${roomId}/messages`);
    const response = await api.post(`/chat/rooms/${roomId}/messages`, payload);
    return response.data.message;
  },

  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/chat-orders/${roomId}/join`);
  },

  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/chat-orders/${roomId}/leave`);
  },
};
