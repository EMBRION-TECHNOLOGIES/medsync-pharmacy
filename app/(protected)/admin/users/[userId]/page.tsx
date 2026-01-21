'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  User,
  Package,
  DollarSign,
  ScrollText,
  MapPin,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
  Heart,
  MessageSquare,
  CreditCard,
  Calendar,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface UserDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  medSyncId: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  healthProfile: {
    bloodGroup: string | null;
    genotype: string | null;
    hasAllergies: boolean;
  };
  emergencyContact: {
    name: string;
    phone: string | null;
    relationship: string | null;
    verified: boolean;
  } | null;
  insurance: {
    provider: string;
    hasNumber: boolean;
  } | null;
  pharmacyUser: {
    roleType: string;
    pharmacy: {
      id: string;
      name: string;
      status: string;
    };
    location: { id: string; name: string } | null;
  } | null;
  counts: {
    orders: number;
    chatMessages: number;
    payments: number;
    medications: number;
    appointments: number;
    supportTickets: number;
  };
  financials: {
    totalOrderValue: number;
    orderCount: number;
    totalPaid: number;
    paymentCount: number;
  };
}

interface UserOrder {
  id: string;
  orderNumber: string;
  orderCode: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  drugName: string | null;
  quantity: number | null;
  pharmacy: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  dispatch: { id: string; status: string; provider: string } | null;
  createdAt: string;
}

interface UserActivity {
  id: string;
  type: string;
  action: string;
  details: any;
  createdAt: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const activityTypeIcons: Record<string, any> = {
  order: Package,
  payment: CreditCard,
  chat: MessageSquare,
  support: AlertCircle,
};

const activityTypeColors: Record<string, string> = {
  order: 'text-blue-600 bg-blue-100',
  payment: 'text-green-600 bg-green-100',
  chat: 'text-purple-600 bg-purple-100',
  support: 'text-amber-600 bg-amber-100',
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch user details
  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery<UserDetail>({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const response = await api.get(`/admin/user-oversight/${userId}`);
      return response.data?.data || response.data;
    },
    enabled: !!userId,
  });

  // Fetch orders (only when tab is active)
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{
    orders: UserOrder[];
    pagination: { total: number };
  }>({
    queryKey: ['admin', 'user', userId, 'orders'],
    queryFn: async () => {
      const response = await api.get(`/admin/user-oversight/${userId}/orders?limit=50`);
      return response.data?.data || response.data;
    },
    enabled: !!userId && activeTab === 'orders',
  });

  // Fetch activity (only when tab is active)
  const { data: activityData, isLoading: activityLoading } = useQuery<{
    activities: UserActivity[];
    summary: {
      totalOrders: number;
      totalPayments: number;
      totalMessages: number;
      totalTickets: number;
    };
  }>({
    queryKey: ['admin', 'user', userId, 'activity'],
    queryFn: async () => {
      const response = await api.get(`/admin/user-oversight/${userId}/activity`);
      return response.data?.data || response.data;
    },
    enabled: !!userId && activeTab === 'activity',
  });

  if (userLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </RoleGuard>
    );
  }

  if (!user) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">User not found</h2>
            <Button className="mt-4" onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {user.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {user.phone}
                  </span>
                )}
                {user.medSyncId && (
                  <span className="font-mono">{user.medSyncId}</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchUser()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{user.counts.orders}</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(user.financials.totalOrderValue)}</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{user.counts.chatMessages}</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{user.counts.appointments}</p>
                  <p className="text-sm text-muted-foreground">Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">MedSync ID</p>
                      <p className="font-mono">{user.medSyncId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.email || '-'}</p>
                        {user.emailVerified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{user.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Login</p>
                      <p className="font-medium">
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Registered</p>
                      <p className="font-medium">{format(new Date(user.createdAt), 'PPP')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">City</p>
                      <p className="font-medium">{user.location.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">State</p>
                      <p className="font-medium">{user.location.state || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Country</p>
                      <p className="font-medium">{user.location.country || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Health Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{user.healthProfile.bloodGroup || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Genotype</p>
                      <p className="font-medium">{user.healthProfile.genotype || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allergies</p>
                      <p className="font-medium">
                        {user.healthProfile.hasAllergies ? 'Has allergies' : 'No known allergies'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Medications</p>
                      <p className="font-medium">{user.counts.medications} tracked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.emergencyContact ? (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{user.emergencyContact.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Relationship</p>
                          <p className="font-medium">{user.emergencyContact.relationship || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{user.emergencyContact.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Verified</p>
                          {user.emergencyContact.verified ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" /> Verified
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not verified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No emergency contact provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Pharmacy Association */}
              {user.pharmacyUser && (
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Pharmacy Association
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pharmacy</p>
                        <p className="font-medium">{user.pharmacyUser.pharmacy.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <Badge variant="outline">{user.pharmacyUser.roleType}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant="outline">{user.pharmacyUser.pharmacy.status}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {user.pharmacyUser.location?.name || 'All locations'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => router.push(`/admin/pharmacies/${user.pharmacyUser?.pharmacy.id}`)}
                    >
                      View Pharmacy
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Financial Summary */}
              <Card className={user.pharmacyUser ? '' : 'col-span-2'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Order Value</p>
                      <p className="text-xl font-bold">{formatCurrency(user.financials.totalOrderValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-bold">{formatCurrency(user.financials.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Count</p>
                      <p className="font-medium">{user.financials.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Count</p>
                      <p className="font-medium">{user.financials.paymentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order History
                  {ordersData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({ordersData.pagination.total} total)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  All orders placed by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : ordersData?.orders && ordersData.orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Drug</TableHead>
                        <TableHead>Pharmacy</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.drugName || '-'}
                            {order.quantity && (
                              <span className="text-muted-foreground ml-1">x{order.quantity}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.pharmacy?.name || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(order.createdAt), 'PP')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No orders found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Recent actions and events for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : activityData?.activities && activityData.activities.length > 0 ? (
                  <div className="space-y-4">
                    {activityData.activities.map((activity) => {
                      const Icon = activityTypeIcons[activity.type] || ScrollText;
                      const colorClass = activityTypeColors[activity.type] || 'text-gray-600 bg-gray-100';
                      
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4 p-4 border rounded-lg"
                        >
                          <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {activity.type}
                              </Badge>
                              <span className="font-medium">{activity.action}</span>
                            </div>
                            {activity.details && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {activity.details.status && (
                                  <span>Status: {activity.details.status}</span>
                                )}
                                {activity.details.amount && (
                                  <span className="ml-2">
                                    Amount: {formatCurrency(activity.details.amount)}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {format(new Date(activity.createdAt), 'PPp')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No activity recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Admin Access</p>
                <p className="text-sm text-blue-700 mt-1">
                  You have full access to view all user data. This is a read-only view - 
                  modifications should be made through proper support channels.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
