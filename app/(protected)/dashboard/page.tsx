'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MessageSquare, Truck, TrendingUp, MapPin, Building2 } from 'lucide-react';
import { useChatOrders } from '@/features/chat-orders/hooks';
import { useChatOrdersSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useAuth } from '@/features/auth/hooks';
import { usePharmacyProfile, usePharmacy } from '@/features/pharmacy/hooks';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: pharmacy, isLoading: pharmacyLoading, error: pharmacyError } = usePharmacyProfile();
  
  // Use new socket hook for real-time updates
  useChatOrdersSocket();
  
  // Fetch data using the unified chat-orders endpoint
  // This endpoint returns both orders and chat rooms in a single response
  const { data: chatOrdersData, isLoading: chatOrdersLoading } = useChatOrders({ status: 'all' });
  
  // Extract orders and rooms from the unified response
  const orders = chatOrdersData?.orders || [];
  const chatRooms = chatOrdersData?.rooms || [];

  // If pharmacy profile fails, try to get pharmacy data from user's pharmacy ID
  const { data: fallbackPharmacy } = usePharmacy((user as any)?.pharmacyId);
  
  // Get the pharmacy data to display
  const displayPharmacy = (pharmacy as any)?.pharmacy || fallbackPharmacy;

  // Check if pharmacy is null (user hasn't registered a pharmacy yet)
  if (!pharmacyLoading && pharmacy && (pharmacy as any)?.pharmacy === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your pharmacy dashboard
          </p>
        </div>
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">No Pharmacy Registered</h3>
              <p className="text-sm text-blue-700">
                You need to register a pharmacy before you can access the dashboard. Please complete the pharmacy registration process.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sort chat rooms by newest first, with unread at top
  const sortedThreads = chatRooms?.sort((a, b) => {
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Debug logging
  console.log('📊 Dashboard Auto-Load:', {
    totalRooms: chatRooms?.length || 0,
    totalOrders: orders?.length || 0,
    unreadRooms: sortedThreads?.filter(t => (t.unreadCount || 0) > 0).length || 0,
    isLoading: chatOrdersLoading,
    rooms: sortedThreads?.map(t => ({
      id: t.id,
      patient: t.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name,
      unread: t.unreadCount,
      lastMessage: t.lastMessage?.content?.substring(0, 50)
    })) || []
  });

  const stats = [
    {
      name: 'Active Chats',
      value: sortedThreads?.length || 0,
      icon: MessageSquare,
      color: 'text-ms-green',
      bgColor: 'bg-ms-green/10',
      priority: true,
    },
    {
      name: 'Pending Orders',
      value: orders?.filter((o: any) => o.status === 'PENDING').length || 0,
      icon: Package,
      color: 'text-ms-blue',
      bgColor: 'bg-ms-blue/10',
    },
    {
      name: 'Ready for Dispatch',
      value: orders?.filter((o: any) => o.status === 'CONFIRMED').length || 0,
      icon: Truck,
      color: 'text-ms-yellow',
      bgColor: 'bg-ms-yellow/10',
    },
    {
      name: 'Today\'s Revenue',
      value: '₦0',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  // Show loading state while data is being fetched
  if (pharmacyLoading || chatOrdersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state if pharmacy profile failed to load
  if (pharmacyError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage patient conversations and orders
          </p>
        </div>
        <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">
            Failed to load pharmacy information. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage patient conversations and orders
        </p>
        {displayPharmacy && (
          <div className="mt-4 p-4 bg-muted/20 rounded-lg border">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">{(displayPharmacy as any)?.name || 'Pharmacy'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{(displayPharmacy as any)?.address || 'Address not available'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Priority Stats - Active Chats First */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className={stat.priority ? 'ring-2 ring-ms-green/20' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-md`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Chats - Primary View */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Active Conversations ({sortedThreads?.length || 0})
              {sortedThreads && sortedThreads.filter(t => (t.unreadCount || 0) > 0).length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-ms-green text-white">
                  {sortedThreads.filter(t => (t.unreadCount || 0) > 0).length} unread
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatOrdersLoading ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : sortedThreads && sortedThreads.length > 0 ? (
              <div className="space-y-3">
                {sortedThreads.slice(0, 8).map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => router.push(`/chat?roomId=${thread.id}`)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                      (thread.unreadCount || 0) > 0 ? 'bg-ms-green/5 border-ms-green/20' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {thread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name || 'Unknown Patient'}
                        </p>
                        {(thread.unreadCount || 0) > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-ms-green text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {thread.lastMessage?.content || 'No messages yet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(thread.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No active conversations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Patient messages will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Recent Orders */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="w-full text-left p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Orders Auto-Generated</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Backend processes patient requests</p>
              </div>
              <div className="w-full text-left p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Dispatch Auto-Booked</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Backend handles courier booking</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {chatOrdersLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Loading orders...</p>
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.slice(0, 4).map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{order.patient.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.drugName}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent orders</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

