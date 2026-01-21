'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from './service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  pharmacyId?: string;
  locationId?: string;
  category?: string; // e.g., 'orders', 'dispatch', 'chat', 'staff', 'compliance'
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

/**
 * Hook to fetch notifications for the current user
 * Notifications are automatically scoped based on:
 * - User's pharmacy (from X-Pharmacy-Id header)
 * - User's location (from X-Location-Id header) for location-scoped users
 * - User's role and permissions (filtered by backend)
 */
export const useNotifications = (pharmacyId?: string) => {
  return useQuery({
    queryKey: ['notifications', pharmacyId],
    queryFn: () => notificationsService.getNotifications(pharmacyId),
    enabled: !!pharmacyId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => 
      notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (pharmacyId: string) => 
      notificationsService.markAllAsRead(pharmacyId),
    onSuccess: () => {
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
