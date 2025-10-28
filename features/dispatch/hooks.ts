import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchService, type EmergencyDispatchRequest, type BookDeliveryRequest, type DeliveryQuoteRequest } from './service';
import { toast } from 'sonner';

export const useEmergencyDispatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmergencyDispatchRequest) => dispatchService.createEmergencyDispatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      toast.success('Emergency dispatch created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create emergency dispatch');
    },
  });
};

export const useDispatchRequests = (filters: any = {}) => {
  return useQuery({
    queryKey: ['dispatch', 'requests', filters],
    queryFn: () => dispatchService.getDispatchRequests(filters),
  });
};

export const useDispatchRequest = (requestId: string) => {
  return useQuery({
    queryKey: ['dispatch', 'request', requestId],
    queryFn: () => dispatchService.getDispatchRequest(requestId),
    enabled: !!requestId,
  });
};

export const useAvailableProviders = (location?: { latitude: number; longitude: number; radius?: number }) => {
  return useQuery({
    queryKey: ['dispatch', 'providers', location],
    queryFn: () => dispatchService.getAvailableProviders(location),
    enabled: !!location,
  });
};

export const useAssignProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, providerId }: { requestId: string; providerId: string }) =>
      dispatchService.assignProvider(requestId, providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      toast.success('Provider assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign provider');
    },
  });
};

export const useUpdateDispatchStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) =>
      dispatchService.updateDispatchStatus(requestId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      toast.success('Dispatch status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update dispatch status');
    },
  });
};

export const useBookDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BookDeliveryRequest) => dispatchService.bookDelivery(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Delivery booked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book delivery');
    },
  });
};

export const useDeliveryQuote = () => {
  return useMutation({
    mutationFn: (data: DeliveryQuoteRequest) => dispatchService.getDeliveryQuote(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to get delivery quote');
    },
  });
};

export const useTrackDelivery = (dispatchId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dispatch', 'track', dispatchId],
    queryFn: () => dispatchService.trackDelivery(dispatchId!),
    enabled: !!dispatchId,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Real-time updates are now handled by useDispatchSocket hook
  // This hook focuses only on data fetching

  return query;
};

export const useDeliveryHistory = (filters: any = {}) => {
  return useQuery({
    queryKey: ['dispatch', 'history', filters],
    queryFn: () => dispatchService.getDeliveryHistory(filters),
  });
};

export const useCancelDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dispatchId, reason }: { dispatchId: string; reason: string }) =>
      dispatchService.cancelDelivery(dispatchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'history'] });
      toast.success('Delivery cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel delivery');
    },
  });
};

export const useCancelDispatchRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      dispatchService.cancelDispatchRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      toast.success('Dispatch request cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel dispatch request');
    },
  });
};

// Kwik integration hooks
export const useKwikQuote = () => {
  return useMutation({
    mutationFn: (data: any) => dispatchService.getKwikQuote(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to get Kwik quote');
    },
  });
};

export const useBookKwikDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => dispatchService.bookKwikDelivery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'history'] });
      toast.success('Kwik delivery booked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book Kwik delivery');
    },
  });
};

export const useTrackKwikDelivery = (dispatchId?: string) => {
  return useQuery({
    queryKey: ['dispatch', 'kwik', 'track', dispatchId],
    queryFn: () => dispatchService.trackKwikDelivery(dispatchId!),
    enabled: !!dispatchId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
};





