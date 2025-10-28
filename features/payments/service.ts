import { api } from '@/lib/api';

export interface PaymentWebhookData {
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  paymentMethod: string;
  transactionId: string;
  timestamp: string;
}

export interface PaymentStatus {
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  paymentMethod: string;
  transactionId: string;
  paidAt?: string;
  failedAt?: string;
  refundedAt?: string;
}

// Use mock data for development
const USE_MOCK_DATA = process.env.NODE_ENV === 'development';

export const paymentService = {
  async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        orderId,
        status: 'paid',
        amount: 1100,
        paymentMethod: 'card',
        transactionId: `txn_${Date.now()}`,
        paidAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };
    }
    
    const response = await api.get(`/payments/status/${orderId}`);
    return response.data;
  },

  async processWebhook(webhookData: PaymentWebhookData): Promise<void> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('Payment webhook processed:', webhookData);
      return;
    }
    
    await api.post('/payments/webhook', webhookData);
  },

  async createPaymentIntent(orderId: string, amount: number): Promise<{
    clientSecret: string;
    paymentUrl: string;
  }> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        clientSecret: `pi_mock_${Date.now()}`,
        paymentUrl: `https://checkout.medsync.com/pay/${orderId}`,
      };
    }
    
    const response = await api.post('/payments/create-intent', { orderId, amount });
    return response.data;
  },

  async refundPayment(orderId: string, amount?: number): Promise<{
    refundId: string;
    status: 'pending' | 'succeeded' | 'failed';
  }> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        refundId: `re_${Date.now()}`,
        status: 'succeeded',
      };
    }
    
    const response = await api.post('/payments/refund', { orderId, amount });
    return response.data;
  },
};
