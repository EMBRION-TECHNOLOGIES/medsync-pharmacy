'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  MessageSquare, 
  Truck, 
  TrendingUp, 
  MapPin, 
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Pill,
  Activity,
  DollarSign,
  ShoppingCart,
  ChevronRight,
  Info,
  Wallet,
  CreditCard
} from 'lucide-react';
import { useDashboard } from '@/features/pharmacy/hooks';
import { useChatOrders } from '@/features/chat-orders/hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useChatOrdersSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useOrg } from '@/store/useOrg';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { LucideIcon } from 'lucide-react';

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function StatCard({ 
  title, 
  value, 
  subtitle,
  tooltip,
  icon: Icon, 
  trend,
  trendValue,
  color = 'primary',
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple';
  onClick?: () => void;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card 
      className={`transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Icon above text (fixes alignment at 1024px–1600px) */}
          <div className={`inline-flex w-fit p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <span title={tooltip} className="cursor-help text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : 
                 trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderStatusCard({ status, count, icon: Icon, color, onClick }: {
  status: string;
  count: number;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
      onClick={onClick}
    >
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{status}</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

export default function DashboardPage() {
  const { locationName, pharmacyId } = useOrg();
  const { roleType } = usePharmacyContext();
  const router = useRouter();
  
  // Check if user is owner (only owners can see revenue)
  const isOwner = roleType === 'PHARMACY_OWNER';
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useDashboard();

  // Fetch financials for owner (30d) — used for Delivered Earnings, Paid Awaiting Delivery, Orders Awaiting Delivery
  const { data: financialsData } = useQuery({
    queryKey: ['financials-dashboard', pharmacyId, '30d'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/financials?range=30d');
      const d = res.data?.data ?? res.data;
      return d?.summary ? d : null;
    },
    enabled: !!pharmacyId && isOwner,
  });
  const summary = financialsData?.summary;
  
  // Use socket for real-time updates
  useChatOrdersSocket();
  
  // Fetch chat data for active conversations
  const { data: chatOrdersData, isLoading: chatLoading } = useChatOrders({ status: 'all' });
  const chatRooms = chatOrdersData?.rooms || [];
  
  // Sort chat rooms by newest first, with unread at top
  const sortedThreads = chatRooms?.sort((a, b) => {
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const unreadCount = sortedThreads?.filter(t => (t.unreadCount || 0) > 0).length || 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Loading your pharmacy data...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Fetching dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your pharmacy dashboard</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to load dashboard</p>
                <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const pharmacy = dashboardData?.pharmacy;
  const recentOrders = dashboardData?.recentOrders || [];
  const topMedications = dashboardData?.topMedications || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {locationName ? `Viewing ${locationName}` : 'Overview of your pharmacy operations'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pharmacy Info Banner */}
      {pharmacy && (
        <Card className="bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{pharmacy.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{pharmacy.address || 'Address not set'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={pharmacy.isActive ? 'default' : 'secondary'} className="px-3 py-1">
                  {pharmacy.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {stats && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Locations</p>
                    <p className="text-lg font-semibold">{stats.locationsCount}</p>
                  </div>
                )}
                {stats && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Staff</p>
                    <p className="text-lg font-semibold">{stats.staffCount}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className={`grid gap-4 md:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Financial Summary (Owner only) — production-ready copy */}
        {isOwner && (
          <>
            <StatCard
              title="Delivered Earnings"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              subtitle="Money earned from completed deliveries."
              tooltip="Includes medication revenue from orders marked Delivered. This amount counts as earned."
              icon={DollarSign}
              color="green"
              onClick={() => router.push('/financials')}
            />
            <StatCard
              title="Paid (Awaiting Delivery)"
              value={formatCurrency(summary?.pendingRevenue ?? 0)}
              subtitle="Orders already paid by customers, awaiting delivery."
              tooltip="Customers have paid, but delivery is not yet complete. This amount becomes earned once delivery is completed."
              icon={Wallet}
              color="yellow"
              onClick={() => router.push('/financials')}
            />
            <StatCard
              title="Orders Awaiting Delivery"
              value={summary?.pendingOrders ?? 0}
              subtitle="Paid orders not yet delivered."
              tooltip="Includes confirmed, prepared, dispensed, and in-transit orders."
              icon={Package}
              color="orange"
              onClick={() => router.push('/financials')}
            />
            <StatCard
              title="Paid Today"
              value={formatCurrency(stats?.revenue?.today ?? 0)}
              subtitle="Orders paid today (informational)."
              tooltip="Shows medication value of orders paid today, regardless of delivery status. This is not the same as earned revenue."
              icon={CreditCard}
              color="blue"
              onClick={() => router.push('/financials')}
            />
          </>
        )}
        {!isOwner && (
          <>
            <StatCard
              title="Orders Today"
              value={stats?.orders?.today || 0}
              subtitle={`${stats?.orders?.thisWeek || 0} this week`}
              icon={ShoppingCart}
              color="blue"
              onClick={() => router.push('/orders')}
            />
            <StatCard
              title="Active Dispatches"
              value={stats?.dispatches?.active || 0}
              subtitle={`${stats?.dispatches?.completedThisMonth || 0} delivered this month`}
              icon={Truck}
              color="orange"
              onClick={() => router.push('/dispatch')}
            />
            <StatCard
              title="Active Chats"
              value={sortedThreads?.length || 0}
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              icon={MessageSquare}
              color={unreadCount > 0 ? 'green' : 'primary'}
              onClick={() => router.push('/chat')}
            />
          </>
        )}
        {isOwner && (
          <>
            <StatCard
              title="Orders Today"
              value={stats?.orders?.today || 0}
              subtitle={`${stats?.orders?.thisWeek || 0} this week`}
              icon={ShoppingCart}
              color="blue"
              onClick={() => router.push('/orders')}
            />
            <StatCard
              title="Active Dispatches"
              value={stats?.dispatches?.active || 0}
              subtitle={`${stats?.dispatches?.completedThisMonth || 0} delivered this month`}
              icon={Truck}
              color="orange"
              onClick={() => router.push('/dispatch')}
            />
            <StatCard
              title="Active Chats"
              value={sortedThreads?.length || 0}
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              icon={MessageSquare}
              color={unreadCount > 0 ? 'green' : 'primary'}
              onClick={() => router.push('/chat')}
            />
          </>
        )}
      </div>

      {/* Order Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Order Pipeline</CardTitle>
              <CardDescription>Current status of all orders</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <OrderStatusCard
              status="Pending"
              count={stats?.orderStatus?.pending || 0}
              icon={Clock}
              color="bg-yellow-100 text-yellow-600"
              onClick={() => router.push('/orders?status=pending')}
            />
            <OrderStatusCard
              status="Confirmed"
              count={stats?.orderStatus?.confirmed || 0}
              icon={CheckCircle2}
              color="bg-blue-100 text-blue-600"
              onClick={() => router.push('/orders?status=confirmed')}
            />
            <OrderStatusCard
              status="In Transit"
              count={stats?.orderStatus?.inTransit || 0}
              icon={Truck}
              color="bg-orange-100 text-orange-600"
              onClick={() => router.push('/orders?status=in_transit')}
            />
            <OrderStatusCard
              status="Delivered"
              count={stats?.orderStatus?.delivered || 0}
              icon={Package}
              color="bg-green-100 text-green-600"
              onClick={() => router.push('/orders?status=delivered')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <CardDescription>Latest orders from your pharmacy</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/orders?id=${order.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{order.orderCode}</p>
                          <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{order.drugName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.patient?.medSyncId || order.patient?.name || 'Unknown patient'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(order.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-1">No Recent Orders</h3>
                <p className="text-sm text-muted-foreground">
                  Orders will appear here as they come in
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Active Conversations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Active Chats
                  {unreadCount > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      {unreadCount} new
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/chat')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chatLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : sortedThreads && sortedThreads.length > 0 ? (
                <div className="space-y-2">
                  {sortedThreads.slice(0, 4).map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => router.push(`/chat?roomId=${thread.id}`)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        (thread.unreadCount || 0) > 0 ? 'bg-green-50 border border-green-200' : 'border'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        (thread.unreadCount || 0) > 0 ? 'bg-green-600 text-white' : 'bg-muted'
                      }`}>
                        {thread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {thread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.lastMessage?.content?.substring(0, 30) || 'No messages'}
                        </p>
                      </div>
                      {(thread.unreadCount || 0) > 0 && (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active conversations</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Medications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Top Medications
              </CardTitle>
              <CardDescription>Most ordered this month</CardDescription>
            </CardHeader>
            <CardContent>
              {topMedications.length > 0 ? (
                <div className="space-y-3">
                  {topMedications.map((med, index) => (
                    <div key={med.name} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.count} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Pill className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Summary - Owner Only (medication sales only, excludes delivery & service fees) */}
          {isOwner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Medication Sales
                </CardTitle>
                <p className="text-xs text-muted-foreground">Your earnings from medication sales</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Today</span>
                    <span className="font-semibold">{formatCurrency(stats?.revenue?.today || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Week</span>
                    <span className="font-semibold">{formatCurrency(stats?.revenue?.thisWeek || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-semibold text-lg">{formatCurrency(stats?.revenue?.thisMonth || 0)}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Orders this month</span>
                      <span className="font-medium">{stats?.orders?.thisMonth || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
