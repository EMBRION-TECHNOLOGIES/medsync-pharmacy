'use client';

import { useEffect, useState } from 'react';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification, Notification } from '@/features/notifications/hooks';
import { useOrg } from '@/store/useOrg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, X, CheckCheck, AlertCircle, Info, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'error':
      return 'text-red-600 border-red-200 bg-red-50';
    case 'warning':
      return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    case 'success':
      return 'text-green-600 border-green-200 bg-green-50';
    case 'info':
    default:
      return 'text-blue-600 border-blue-200 bg-blue-50';
  }
};

const getCategoryLabel = (category?: string) => {
  const labels: Record<string, string> = {
    orders: 'Orders',
    dispatch: 'Dispatch',
    chat: 'Chat',
    staff: 'Staff',
    compliance: 'Compliance',
    financials: 'Financials',
    general: 'General',
  };
  return labels[category || 'general'] || 'General';
};

export default function NotificationsPage() {
  const { pharmacyId, locationId, locationName } = useOrg();
  const { data: notificationsData, isLoading, refetch, isFetching } = useNotifications(pharmacyId);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Refetch when location changes
  useEffect(() => {
    if (pharmacyId) {
      refetch();
    }
  }, [locationId, pharmacyId, refetch]);

  const notifications = notificationsData?.notifications || [];
  
  // Calculate counts from the actual notifications array (not from API's unreadCount which might be for all notifications)
  const actualUnreadCount = notifications.filter((n) => !n.read).length;
  const actualReadCount = notifications.filter((n) => n.read).length;
  const totalCount = notifications.length;

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    return true;
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId, {
      onSuccess: () => {
        toast.success('Notification marked as read');
      },
    });
  };

  const handleMarkAllAsRead = () => {
    if (pharmacyId) {
      markAllAsRead.mutate(pharmacyId, {
        onSuccess: () => {
          toast.success('All notifications marked as read');
        },
      });
    }
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification.mutate(notificationId, {
      onSuccess: () => {
        toast.success('Notification dismissed');
      },
    });
  };

  const categories = Array.from(new Set(notifications.map((n) => n.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {locationName ? `Viewing ${locationName}` : 'Manage your notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actualUnreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={markAllAsRead.isPending}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold text-primary">{actualUnreadCount}</p>
            </div>
            {actualUnreadCount > 0 && (
              <Badge variant="destructive" className="h-8 w-8 rounded-full flex items-center justify-center">
                {actualUnreadCount > 99 ? '99+' : actualUnreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-2xl font-bold">{actualReadCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread' | 'read')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="read">Read Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No notifications found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {filter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                notification.read ? 'bg-muted/30' : getNotificationColor(notification.type)
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-base font-semibold ${notification.read ? 'text-muted-foreground' : ''}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                        )}
                        {notification.category && (
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(notification.category)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsRead.isPending}
                          className="h-8"
                        >
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleteNotification.isPending}
                        className="h-8 w-8"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
