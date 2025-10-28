import { api } from '@/lib/api';
import { Notification, NotificationResponse } from './hooks';

export const notificationsService = {
  async getNotifications(pharmacyId?: string): Promise<NotificationResponse> {
    const params = new URLSearchParams();
    if (pharmacyId) {
      params.append('pharmacyId', pharmacyId);
    }
    
    const response = await api.get(`/notifications?${params}`);
    return {
      notifications: response.data.notifications || [],
      unreadCount: response.data.unreadCount || 0,
      total: response.data.total || 0,
    };
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(pharmacyId: string): Promise<void> {
    await api.patch(`/notifications/mark-all-read`, { pharmacyId });
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
