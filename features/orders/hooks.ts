import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, type OrderFilters } from './service';
import { OrderStatus } from '@/lib/zod-schemas';
import { toast } from 'sonner';
import { useOrg } from '@/store/useOrg';

export const useOrders = (filters: OrderFilters) => {
  const queryClient = useQueryClient();
  const { pharmacyId } = useOrg();

  const query = useQuery({
    queryKey: ['orders', pharmacyId, filters],
    queryFn: () => ordersService.getOrders(filters),
    enabled: !!pharmacyId,
  });

  // Real-time updates are now handled by useChatOrdersSocket hook
  // This hook focuses only on data fetching and mutations

  return query;
};

export const useOrder = (id: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getOrder(id),
    enabled: !!id,
  });

  // Real-time updates are now handled by useChatOrdersSocket hook
  // This hook focuses only on data fetching

  return query;
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string }) =>
      ordersService.updateOrderStatus(id, status, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', data.id], data);
      toast.success(`Order ${data.status.toLowerCase()} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
};

export const useDispenseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      ordersService.dispenseOrder(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', data.id], data);
      toast.success('Order dispensed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to dispense order');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ordersService.cancelOrder(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', data.id], data);
      toast.success('Order cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });
};

