import { api } from '@/lib/api';
import { Order } from '@/lib/zod-schemas';

export interface CreateOrderRequest {
  drugName: string;
  quantity: number;
  dosageSig: string;
  priceNgn: number;
}

export interface CreateOrderResponse {
  order: Order;
}

export const quoteService = {
  async createOrderFromChat(roomId: string, orderData: CreateOrderRequest): Promise<Order> {
    const response = await api.post(`/chat-orders/${roomId}/order`, orderData);
    return response.data.order;
  },

  async bookOrderDelivery(orderId: string, deliveryData: {
    deliveryAddress: {
      latitude: number;
      longitude: number;
      address: string;
    };
    vehicleType?: 'bike' | 'van' | 'auto';
  }): Promise<any> {
    const response = await api.post(`/chat-orders/${orderId}/book-delivery`, deliveryData);
    return response.data;
  },
};
