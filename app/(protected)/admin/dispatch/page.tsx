'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Truck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Building,
  User,
  Package,
  ExternalLink,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Dispatch {
  id: string;
  provider: string;
  status: string;
  deliveryCharge: number | null;
  currency: string;
  trackingUrl: string | null;
  driverPhoneMasked: string | null;
  deliveredAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    customer: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  pharmacy: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
    address: string;
  } | null;
  createdAt: string;
}

interface DispatchStats {
  overview: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    delivered: number;
    canceled: number;
    successRate: number;
    cancelRate: number;
  };
  performance: {
    avgDeliveryMinutes: number;
    totalDeliveryCharges: number;
    currency: string;
  };
  byStatus: Array<{ status: string; count: number }>;
  byProvider: Array<{ provider: string; count: number; revenue: number }>;
  dispatchJobs: {
    total: number;
    active: number;
    completed: number;
  };
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  QUOTED: 'bg-blue-100 text-blue-800',
  BOOKED: 'bg-amber-100 text-amber-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
};

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function DispatchOversightPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const limit = 20;

  const { data: stats } = useQuery<DispatchStats>({
    queryKey: ['admin', 'dispatch-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dispatch-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dispatch-oversight', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/dispatch-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: dispatchDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'dispatch-oversight', selectedDispatch?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/dispatch-oversight/${selectedDispatch?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedDispatch?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Dispatch Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor deliveries and dispatch performance
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.overview?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Dispatches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.overview?.delivered || 0}</div>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.overview?.successRate || 0}%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.performance?.avgDeliveryMinutes || 0} min</div>
              <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats?.performance?.totalDeliveryCharges || 0, stats?.performance?.currency)}
              </div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Breakdown */}
        {stats?.byProvider && stats.byProvider.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {stats.byProvider.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Badge variant="secondary">{p.provider}</Badge>
                    <span className="text-sm">{p.count} deliveries</span>
                    <span className="text-sm text-muted-foreground">
                      ({formatCurrency(p.revenue, stats.performance?.currency)})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="CREATED">Created</SelectItem>
                  <SelectItem value="BOOKED">Booked</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dispatches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dispatches</CardTitle>
            <CardDescription>Click to view full details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to load dispatches
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Charge</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.dispatches && data.dispatches.length > 0 ? (
                      data.dispatches.map((dispatch: Dispatch) => (
                        <TableRow
                          key={dispatch.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedDispatch(dispatch)}
                        >
                          <TableCell className="font-mono text-sm">
                            {dispatch.order?.orderNumber || '-'}
                          </TableCell>
                          <TableCell>
                            {dispatch.order?.customer ? (
                              <div>
                                <div className="text-sm">{dispatch.order.customer.name}</div>
                                <div className="text-xs text-muted-foreground">{dispatch.order.customer.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{dispatch.pharmacy?.name || '-'}</TableCell>
                          <TableCell>{dispatch.provider}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[dispatch.status] || 'bg-gray-100'}>
                              {dispatch.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {dispatch.deliveryCharge
                              ? formatCurrency(dispatch.deliveryCharge, dispatch.currency)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(dispatch.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No dispatches found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data?.pagination && data.pagination.total > limit && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.pagination.total)} of {data.pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data.pagination.hasMore}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedDispatch} onOpenChange={(open) => !open && setSelectedDispatch(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Dispatch Details
              </DialogTitle>
              <DialogDescription>
                Order #{dispatchDetail?.order?.orderNumber || selectedDispatch?.order?.orderNumber || 'N/A'}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : dispatchDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <Badge className={statusColors[dispatchDetail.status] || 'bg-gray-100'}>
                      {dispatchDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Provider</h4>
                    <p>{dispatchDetail.provider}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Delivery Charge</h4>
                    <p>{dispatchDetail.deliveryCharge
                      ? formatCurrency(dispatchDetail.deliveryCharge, dispatchDetail.currency)
                      : '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Delivered At</h4>
                    <p>{dispatchDetail.deliveredAt
                      ? format(new Date(dispatchDetail.deliveredAt), 'MMM d, yyyy h:mm a')
                      : 'Not yet'}</p>
                  </div>
                  {dispatchDetail.driverPhoneMasked && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Driver Phone</h4>
                      <p>{dispatchDetail.driverPhoneMasked}</p>
                    </div>
                  )}
                  {dispatchDetail.otp && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">OTP</h4>
                      <p className="font-mono">{dispatchDetail.otp}</p>
                    </div>
                  )}
                </div>

                {dispatchDetail.trackingUrl && (
                  <div>
                    <a
                      href={dispatchDetail.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Track Delivery
                    </a>
                  </div>
                )}

                {dispatchDetail.order && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Order #:</span> {dispatchDetail.order.orderNumber}</div>
                        <div><span className="text-muted-foreground">Status:</span> {dispatchDetail.order.status}</div>
                        {dispatchDetail.order.customer && (
                          <>
                            <div><span className="text-muted-foreground">Customer:</span> {dispatchDetail.order.customer.name}</div>
                            <div className="col-span-2 break-words"><span className="text-muted-foreground">Email:</span> {dispatchDetail.order.customer.email}</div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {dispatchDetail.pharmacy && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Pharmacy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {dispatchDetail.pharmacy.name}</div>
                        {dispatchDetail.location && (
                          <>
                            <div><span className="text-muted-foreground">Location:</span> {dispatchDetail.location.name}</div>
                            <div><span className="text-muted-foreground">Address:</span> {dispatchDetail.location.address}</div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
