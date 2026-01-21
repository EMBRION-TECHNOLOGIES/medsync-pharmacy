'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Package,
  MapPin,
  Truck,
  DollarSign,
  ShieldCheck,
  FlaskConical,
  ArrowRight,
  RefreshCw,
  Loader2,
  Activity,
  Users,
  UserPlus,
  UserCheck,
  ShoppingBag,
  Pill,
  PillBottle,
  Wallet,
  CreditCard,
  ArrowUpRight,
  Headphones,
  MessageCircle,
  TicketCheck,
  Bot,
  Heart,
  FileText,
  Zap,
  TrendingUp,
  StickyNote,
  Phone,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  pharmacies: {
    total: number;
    active: number;
    incomplete: number;
    suspended: number;
    testMode: number;
  };
  patients: {
    total: number;
    active: number;
    newThisWeek: number;
    newThisMonth: number;
    withOrders: number;
  };
  medications: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  wallet: {
    totalBalance: number;
    walletCount: number;
    transactionsThisWeek: number;
    depositsThisWeek: number;
    currency: string;
  };
  support: {
    total: number;
    open: number;
    newThisWeek: number;
  };
  orders: {
    today: number;
    thisWeek: number;
  };
  locations: {
    active: number;
  };
  dispatch: {
    total: number;
    delivered: number;
    thisWeek: number;
    failedThisWeek: number;
    active: number;
    successRate: number;
  };
  ai: {
    total: number;
    today: number;
    thisWeek: number;
    tokensUsed: number;
  };
  vitals: {
    total: number;
    thisWeek: number;
  };
  healthRecords: {
    total: number;
    healthRecords: number;
    medicalRecords: number;
    thisWeek: number;
  };
  notes: {
    total: number;
    thisWeek: number;
    aiEnabled: number;
  };
  emergency: {
    withContact: number;
    withEmsId: number;
    contactRate: number;
  };
  financials: {
    weeklyVolume: number;
    currency: string;
  };
  pendingActions: {
    approvals: number;
  };
  generatedAt: string;
}

interface RecentActivity {
  id: string;
  type: 'verification' | 'governance';
  action: string;
  notes: string | null;
  pharmacy: { id: string; name: string; displayName?: string } | null;
  actor: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  createdAt: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
  href,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple';
  href?: string;
}) {
  const variantStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    purple: 'text-purple-600',
  };

  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function formatCurrency(amount: number, currency: string = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Set to Pending',
    test_mode_enabled: 'Test Mode Enabled',
    test_mode_disabled: 'Test Mode Disabled',
    governance_status_active: 'Activated',
    governance_status_suspended: 'Suspended',
    governance_status_incomplete: 'Set Incomplete',
    compliance_item_updated: 'Compliance Updated',
  };
  return labels[action] || action;
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('approved') || action.includes('active') || action.includes('enabled')) {
    return 'default';
  }
  if (action.includes('rejected') || action.includes('suspended') || action.includes('disabled')) {
    return 'destructive';
  }
  return 'secondary';
}

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data?.data || response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ['admin', 'dashboard', 'activity'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/recent-activity?limit=10');
      return response.data?.data || response.data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isLoading = statsLoading;

  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      fallback={
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You need admin access to view this dashboard.
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System overview and pending actions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Pending Actions Alert */}
            {stats && stats.pendingActions.approvals > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {stats.pendingActions.approvals} pharmacy{stats.pendingActions.approvals !== 1 ? 'ies' : ''} awaiting approval
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Review and approve to enable operations
                        </p>
                      </div>
                    </div>
                    <Link href="/admin/verification?status=pending">
                      <Button variant="outline" size="sm" className="border-amber-300">
                        Review Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pharmacy Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Pharmacies</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Pharmacies"
                  value={stats?.pharmacies.total || 0}
                  icon={Building2}
                  href="/admin/governance"
                />
                <StatCard
                  title="Active"
                  value={stats?.pharmacies.active || 0}
                  icon={CheckCircle2}
                  variant="success"
                  description="Operational pharmacies"
                  href="/admin/governance?status=ACTIVE"
                />
                <StatCard
                  title="Incomplete"
                  value={stats?.pharmacies.incomplete || 0}
                  icon={Clock}
                  variant="warning"
                  description="Pending setup"
                  href="/admin/governance?status=INCOMPLETE"
                />
                <StatCard
                  title="Suspended"
                  value={stats?.pharmacies.suspended || 0}
                  icon={XCircle}
                  variant="danger"
                  description="Operations halted"
                  href="/admin/governance?status=SUSPENDED"
                />
                <StatCard
                  title="Test Mode"
                  value={stats?.pharmacies.testMode || 0}
                  icon={FlaskConical}
                  variant="purple"
                  description="Testing/demo"
                />
              </div>
            </div>

            {/* Patient Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Patients</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Patients"
                  value={stats?.patients?.total || 0}
                  icon={Users}
                  href="/admin/users?role=PATIENT"
                />
                <StatCard
                  title="Active (30 days)"
                  value={stats?.patients?.active || 0}
                  icon={UserCheck}
                  variant="success"
                  description="Logged in recently"
                />
                <StatCard
                  title="New This Week"
                  value={stats?.patients?.newThisWeek || 0}
                  icon={UserPlus}
                  variant="success"
                  description="Registered last 7 days"
                />
                <StatCard
                  title="New This Month"
                  value={stats?.patients?.newThisMonth || 0}
                  icon={UserPlus}
                  description="Registered last 30 days"
                />
                <StatCard
                  title="With Orders"
                  value={stats?.patients?.withOrders || 0}
                  icon={ShoppingBag}
                  variant="success"
                  description="Placed at least 1 order"
                  href="/admin/users?role=PATIENT"
                />
              </div>
            </div>

            {/* Medications Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Medications</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Medications"
                  value={stats?.medications?.total || 0}
                  icon={Pill}
                  description="Tracked across platform"
                  href="/admin/medications"
                />
                <StatCard
                  title="Active Schedules"
                  value={stats?.medications?.active || 0}
                  icon={PillBottle}
                  variant="success"
                  description="Currently being tracked"
                />
                <StatCard
                  title="Added This Week"
                  value={stats?.medications?.newThisWeek || 0}
                  icon={Pill}
                  description="New medications added"
                />
              </div>
            </div>

            {/* Wallet Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Wallet & Transactions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Balance"
                  value={formatCurrency(stats?.wallet?.totalBalance || 0, stats?.wallet?.currency || 'NGN')}
                  icon={Wallet}
                  variant="success"
                  description={`Across ${stats?.wallet?.walletCount || 0} wallets`}
                />
                <StatCard
                  title="Deposits This Week"
                  value={formatCurrency(stats?.wallet?.depositsThisWeek || 0, stats?.wallet?.currency || 'NGN')}
                  icon={ArrowUpRight}
                  variant="success"
                  description="Funds added"
                />
                <StatCard
                  title="Transactions"
                  value={stats?.wallet?.transactionsThisWeek || 0}
                  icon={CreditCard}
                  description="This week"
                />
                <StatCard
                  title="Active Wallets"
                  value={stats?.wallet?.walletCount || 0}
                  icon={Wallet}
                  description="Total user wallets"
                />
              </div>
            </div>

            {/* Support Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Support</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Tickets"
                  value={stats?.support?.total || 0}
                  icon={Headphones}
                  description="All time"
                  href="/admin/support"
                />
                <StatCard
                  title="Open Tickets"
                  value={stats?.support?.open || 0}
                  icon={TicketCheck}
                  variant={stats?.support?.open && stats.support.open > 0 ? 'warning' : 'default'}
                  description="Awaiting resolution"
                  href="/admin/support?status=open"
                />
                <StatCard
                  title="New This Week"
                  value={stats?.support?.newThisWeek || 0}
                  icon={MessageCircle}
                  description="Tickets created"
                />
              </div>
            </div>

            {/* AI Usage Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">AI Usage</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Invocations"
                  value={stats?.ai?.total || 0}
                  icon={Bot}
                  description="All time"
                  href="/admin/ai"
                />
                <StatCard
                  title="Today"
                  value={stats?.ai?.today || 0}
                  icon={Zap}
                  variant="success"
                  description="AI calls today"
                />
                <StatCard
                  title="This Week"
                  value={stats?.ai?.thisWeek || 0}
                  icon={Bot}
                  description="Last 7 days"
                />
                <StatCard
                  title="Tokens Used"
                  value={(stats?.ai?.tokensUsed || 0).toLocaleString()}
                  icon={Activity}
                  description="Total tokens"
                />
              </div>
            </div>

            {/* Health Data Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Health Data</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Vitals Logged"
                  value={stats?.vitals?.total || 0}
                  icon={Heart}
                  description="All time"
                  href="/admin/vitals"
                />
                <StatCard
                  title="Vitals This Week"
                  value={stats?.vitals?.thisWeek || 0}
                  icon={Heart}
                  variant="success"
                  description="New entries"
                />
                <StatCard
                  title="Health Records"
                  value={stats?.healthRecords?.total || 0}
                  icon={FileText}
                  description="Total records"
                  href="/admin/health-records"
                />
                <StatCard
                  title="Records This Week"
                  value={stats?.healthRecords?.thisWeek || 0}
                  icon={FileText}
                  variant="success"
                  description="New uploads"
                />
              </div>
            </div>

            {/* Dispatch Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Delivery & Dispatch</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Dispatches"
                  value={stats?.dispatch?.total || 0}
                  icon={Truck}
                  description="All time"
                  href="/admin/dispatch"
                />
                <StatCard
                  title="Delivered"
                  value={stats?.dispatch?.delivered || 0}
                  icon={CheckCircle2}
                  variant="success"
                  description="Successfully delivered"
                />
                <StatCard
                  title="This Week"
                  value={stats?.dispatch?.thisWeek || 0}
                  icon={Truck}
                  description="New dispatches"
                />
                <StatCard
                  title="Success Rate"
                  value={`${stats?.dispatch?.successRate || 0}%`}
                  icon={TrendingUp}
                  variant={stats?.dispatch?.successRate && stats.dispatch.successRate >= 90 ? 'success' : stats?.dispatch?.successRate && stats.dispatch.successRate >= 70 ? 'warning' : 'default'}
                  description="Delivery success"
                />
                <StatCard
                  title="Active"
                  value={stats?.dispatch?.active || 0}
                  icon={Truck}
                  variant="warning"
                  description="In progress"
                />
              </div>
            </div>

            {/* Notes & Emergency Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Notes & Emergency</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <StatCard
                  title="Total Notes"
                  value={stats?.notes?.total || 0}
                  icon={StickyNote}
                  href="/admin/notes"
                />
                <StatCard
                  title="Notes This Week"
                  value={stats?.notes?.thisWeek || 0}
                  icon={StickyNote}
                  variant="success"
                />
                <StatCard
                  title="AI-Enabled Notes"
                  value={stats?.notes?.aiEnabled || 0}
                  icon={Bot}
                  description="Shared with AI"
                />
                <StatCard
                  title="With Emergency Contact"
                  value={stats?.emergency?.withContact || 0}
                  icon={Phone}
                  href="/admin/emergency"
                />
                <StatCard
                  title="Contact Rate"
                  value={`${stats?.emergency?.contactRate || 0}%`}
                  icon={Shield}
                  variant={stats?.emergency?.contactRate && stats.emergency.contactRate >= 70 ? 'success' : 'warning'}
                />
                <StatCard
                  title="With EMS ID"
                  value={stats?.emergency?.withEmsId || 0}
                  icon={AlertTriangle}
                  description="Emergency ready"
                />
              </div>
            </div>

            {/* Operations Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Operations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Orders Today"
                  value={stats?.orders.today || 0}
                  icon={Package}
                  href="/admin/orders"
                />
                <StatCard
                  title="Orders This Week"
                  value={stats?.orders.thisWeek || 0}
                  icon={Package}
                  description="Last 7 days"
                  href="/admin/orders"
                />
                <StatCard
                  title="Active Locations"
                  value={stats?.locations.active || 0}
                  icon={MapPin}
                />
                <StatCard
                  title="Active Dispatches"
                  value={stats?.dispatch.active || 0}
                  icon={Truck}
                  description="In progress"
                />
              </div>
            </div>

            {/* Financial & Dispatch Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Weekly Volume
                  </CardTitle>
                  <CardDescription>Order value in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(stats?.financials.weeklyVolume || 0, stats?.financials.currency)}
                  </div>
                  <Link href="/admin/financials">
                    <Button variant="link" className="px-0 mt-2">
                      View Financial Details
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Delivery Issues
                  </CardTitle>
                  <CardDescription>Failed deliveries this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${(stats?.dispatch.failedThisWeek || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stats?.dispatch.failedThisWeek || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(stats?.dispatch.failedThisWeek || 0) === 0
                      ? 'No delivery issues this week'
                      : 'Review failed deliveries'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common admin tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Link href="/admin/verification">
                    <Button variant="outline" className="w-full justify-start">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Verify Pharmacies
                    </Button>
                  </Link>
                  <Link href="/admin/governance">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      Governance Review
                    </Button>
                  </Link>
                  <Link href="/admin/orders">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      View Orders
                    </Button>
                  </Link>
                  <Link href="/admin/audit-logs">
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="h-4 w-4 mr-2" />
                      Audit Logs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest admin actions and events</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getActionBadgeVariant(activity.action)}>
                              {getActionLabel(activity.action)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {activity.pharmacy?.displayName || activity.pharmacy?.name || 'Unknown pharmacy'}
                            </span>
                          </div>
                          {activity.actor && (
                            <p className="text-xs text-muted-foreground">
                              by {activity.actor.firstName} {activity.actor.lastName}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Link href="/admin/audit-logs">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Activity
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
