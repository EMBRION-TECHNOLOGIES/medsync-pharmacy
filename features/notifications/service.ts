import { api } from '@/lib/api';
import { Notification, NotificationResponse } from './hooks';

export const notificationsService = {
  /**
   * Get notifications for the current user
   * The backend filters based on:
   * - User ID (from auth token)
   * - Pharmacy ID (from X-Pharmacy-Id header)
   * - Location ID (from X-Location-Id header) for location-scoped users
   * - User's role and permissions
   */
  async getNotifications(pharmacyId?: string, options?: { page?: number; limit?: number }): Promise<NotificationResponse> {
    // Note: pharmacyId and locationId are sent via headers by the API interceptor
    // The backend will filter notifications based on user's role and scope
    const params = new URLSearchParams();
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const queryString = params.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    const response = await api.get(url);
    
    // Handle both wrapped and unwrapped responses
    const data = response.data?.data || response.data;
    
    return {
      notifications: data?.notifications || [],
      unreadCount: data?.unreadCount || data?.count || 0,
      total: data?.total || data?.notifications?.length || 0,
    };
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(pharmacyId: string): Promise<void> {
    await api.patch(`/notifications/mark-all-read`);
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },

  async createNotification(data: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    pharmacyId?: string;
  }): Promise<Notification> {
    const response = await api.post('/notifications', data);
    return response.data.notification;
  },
};
