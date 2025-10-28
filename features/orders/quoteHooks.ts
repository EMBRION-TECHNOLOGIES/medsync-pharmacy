import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quoteService, type CreateQuoteRequest, type ConvertQuoteToOrderRequest } from './quoteService';
import { toast } from 'sonner';

export const useCreateQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuoteRequest) => quoteService.createQuote(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
      toast.success('Quote created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create quote');
    },
  });
};

export const useConvertQuoteToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertQuoteToOrderRequest) => quoteService.convertQuoteToOrder(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
      toast.success('Order created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
};

export const useQuote = (quoteId?: string) => {
  return useQuery({
    queryKey: ['quotes', quoteId],
    queryFn: () => quoteService.getQuote(quoteId!),
    enabled: !!quoteId,
  });
};

export const useAcceptQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteService.acceptQuote(quoteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
      toast.success('Quote accepted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept quote');
    },
  });
};

export const useRejectQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason?: string }) => 
      quoteService.rejectQuote(quoteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
      toast.success('Quote rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject quote');
    },
  });
};
