import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatOrdersService, ChatOrdersFilters } from './service';
import { toast } from 'sonner';
import { useOrg } from '@/store/useOrg';

export const useChatOrders = (filters: ChatOrdersFilters = {}) => {
  const { pharmacyId } = useOrg();
  
  return useQuery({
    queryKey: ['chat-orders', { scope: 'pharmacy', pharmacyId }, filters],
    queryFn: () => chatOrdersService.getChatOrders(filters),
    staleTime: 0, // Always consider data stale to ensure fresh data on every request
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!pharmacyId,
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => chatOrdersService.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) =>
      chatOrdersService.updateOrderStatus(orderId, status as any, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update order status');
    },
  });
};

export const useDispenseOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) =>
      chatOrdersService.dispenseOrder(orderId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order dispensed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to dispense order');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      chatOrdersService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel order');
    },
  });
};

export const useChatMessages = (roomId: string, page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: ['messages', roomId, page, limit],
    queryFn: () => chatOrdersService.getMessages(roomId, page, limit),
    enabled: !!roomId,
    staleTime: 10000, // 10 seconds
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roomId, content, messageType }: { roomId: string; content: string; messageType?: 'TEXT' | 'IMAGE' | 'FILE' }) =>
      chatOrdersService.sendMessage(roomId, content, messageType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send message');
    },
  });
};

export const useJoinRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roomId: string) => chatOrdersService.joinRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      toast.success('Joined room successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to join room');
    },
  });
};

export const useLeaveRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roomId: string) => chatOrdersService.leaveRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      toast.success('Left room successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to leave room');
    },
  });
};

// Legacy socket hook removed - use useChatRoomSocket from useChatOrdersSocket.ts instead
