'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  Loader2,
  X,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AdminNotification {
  id: string;
  type: 'approval' | 'warning' | 'alert' | 'info';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: AdminNotification[];
  summary: {
    total: number;
    unread: number;
    byType: {
      approval: number;
      warning: number;
      alert: number;
      info: number;
    };
  };
}

const typeIcons = {
  approval: ShieldCheck,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
};

const typeColors = {
  approval: 'text-blue-600 bg-blue-100',
  warning: 'text-amber-600 bg-amber-100',
  alert: 'text-red-600 bg-red-100',
  info: 'text-gray-600 bg-gray-100',
};

export function AdminNotificationPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['admin', 'notifications', 'count'],
    queryFn: async () => {
      const response = await api.get('/admin/notifications/count');
      return { count: response.data?.count ?? 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notifications, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => {
      const response = await api.get('/admin/notifications');
      return {
        notifications: response.data?.notifications || [],
        summary: response.data?.summary || { total: 0, unread: 0, byType: { approval: 0, warning: 0, alert: 0, info: 0 } },
      };
    },
    enabled: open, // Only fetch when panel is open
  });

  // Dismiss single notification
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post(`/admin/notifications/${notificationId}/dismiss`);
    },
    onSuccess: () => {
      // Invalidate both queries to refresh the list and count
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'count'] });
    },
  });

  // Dismiss all notifications
  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/notifications/dismiss-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'count'] });
      toast.success('All notifications dismissed');
    },
  });

  const handleDismiss = (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const handleActionClick = (notification: AdminNotification) => {
    // Dismiss the notification when action is clicked
    dismissMutation.mutate(notification.id);
    setOpen(false);
  };

  const count = countData?.count || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs rounded-full"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Admin Notifications</h4>
            <p className="text-sm text-muted-foreground">
              {notifications?.notifications?.length 
                ? `${notifications.notifications.length} items need attention` 
                : count > 0 
                  ? `${count} items need attention`
                  : 'No pending items'}
            </p>
          </div>
          {notifications?.notifications && notifications.notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => dismissAllMutation.mutate()}
              disabled={dismissAllMutation.isPending}
            >
              {dismissAllMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Clear all
                </>
              )}
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications?.notifications && notifications.notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.notifications.slice(0, 15).map((notification) => {
                const Icon = typeIcons[notification.type];
                const colorClass = typeColors[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors relative group"
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={(e) => handleDismiss(notification.id, e)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                    
                    <div className="flex gap-3">
                      <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {notification.actionUrl && (
                            <Link 
                              href={notification.actionUrl} 
                              onClick={() => handleActionClick(notification)}
                            >
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                {notification.action || 'View'}
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All caught up!</p>
              <p className="text-xs">No pending notifications</p>
            </div>
          )}
        </div>
        {notifications?.notifications && notifications.notifications.length > 15 && (
          <div className="border-t px-4 py-2">
            <Link href="/admin/dashboard" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full">
                View all {notifications.notifications.length} notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
