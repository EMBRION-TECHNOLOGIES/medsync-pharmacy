import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService, type PaymentWebhookData } from './service';
import { toast } from 'sonner';

export const usePaymentStatus = (orderId?: string) => {
  return useQuery({
    queryKey: ['payments', 'status', orderId],
    queryFn: () => paymentService.getPaymentStatus(orderId!),
    enabled: !!orderId,
    refetchInterval: 5000, // Check every 5 seconds for payment updates
  });
};

export const useCreatePaymentIntent = () => {
  return useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) =>
      paymentService.createPaymentIntent(orderId, amount),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create payment intent');
    },
  });
};

export const useRefundPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount?: number }) =>
      paymentService.refundPayment(orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Refund processed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process refund');
    },
  });
};

export const useProcessWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookData: PaymentWebhookData) => paymentService.processWebhook(webhookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
    },
  });
};
