'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package,
  Download,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  Building2,
  MapPin,
  User,
  Truck,
  CreditCard,
  Eye,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  orderNumber: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  drugName: string;
  quantity: number;
  deliveryAddress: string | null;
  pharmacy: { id: string; name: string; displayName?: string } | null;
  location: { id: string; name: string; address?: string } | null;
  patient: { id: string; name: string; medSyncId?: string } | null;
  dispatch: { id: string; status: string; provider: string } | null;
  isConfirmed: boolean;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const DEFAULT_LIMIT = 25;

const orderStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const paymentStatusOptions = [
  { value: 'all', label: 'All Payment Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

function getStatusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'IN_TRANSIT':
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CONFIRMED':
    case 'READY_FOR_PICKUP':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'CANCELLED':
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getPaymentBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'FAILED':
    case 'REFUNDED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatStatus(status: string): string {
  if (!status) return 'Unknown';
  
  // Convert to title case: replace underscores with spaces, then capitalize each word
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<OrdersResponse>({
    queryKey: ['admin', 'orders', { page, statusFilter, paymentFilter, appliedSearch, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', DEFAULT_LIMIT.toString());
      params.append('offset', (page * DEFAULT_LIMIT).toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (appliedSearch) params.append('search', appliedSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/orders?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const orders = data?.orders || [];
  const total = data?.pagination?.total || 0;
  const hasMore = data?.pagination?.hasMore || false;
  const totalPages = Math.ceil(total / DEFAULT_LIMIT);

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSearchInput('');
    setAppliedSearch('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/admin/orders/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export orders:', error);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      fallback={
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Order Oversight</h1>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You need admin access to view orders.
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Oversight</h1>
            <p className="text-muted-foreground">
              View all orders across pharmacies (read-only)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Order #, code, drug..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${total} orders found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Pharmacy</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium font-mono text-sm">
                                {order.orderNumber || order.orderCode}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {order.drugName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm truncate max-w-[120px]">
                                  {order.pharmacy?.displayName || order.pharmacy?.name || 'Unknown'}
                                </p>
                                {order.location && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {order.location.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="text-sm">{order.patient?.name || 'Anonymous'}</p>
                                {order.patient?.medSyncId && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {order.patient.medSyncId}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeClass(order.status)}>
                              {formatStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getPaymentBadgeClass(order.paymentStatus)}>
                              {formatStatus(order.paymentStatus || 'N/A')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.totalAmount || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs">
                                {format(new Date(order.createdAt), 'MMM d, HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * DEFAULT_LIMIT + 1}–{Math.min((page + 1) * DEFAULT_LIMIT, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || isFetching}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore || isFetching}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.orderNumber || selectedOrder?.orderCode}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusBadgeClass(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <Badge variant="outline" className={getPaymentBadgeClass(selectedOrder.paymentStatus)}>
                      {selectedOrder.paymentStatus || 'N/A'}
                    </Badge>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Order Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Drug</p>
                      <p className="font-medium">{selectedOrder.drugName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-medium">{selectedOrder.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.totalAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{format(new Date(selectedOrder.createdAt), 'PPpp')}</p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Pharmacy</h4>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.pharmacy?.displayName || selectedOrder.pharmacy?.name}</span>
                  </div>
                  {selectedOrder.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.location.name}</span>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Patient</h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.patient?.name || 'Anonymous'}</span>
                  </div>
                  {selectedOrder.patient?.medSyncId && (
                    <p className="text-sm text-muted-foreground font-mono">
                      TeraSync ID: {selectedOrder.patient.medSyncId}
                    </p>
                  )}
                  {selectedOrder.deliveryAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedOrder.deliveryAddress}</span>
                    </div>
                  )}
                </div>

                {selectedOrder.dispatch && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">Dispatch</h4>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.dispatch.provider}</span>
                      <Badge variant="outline" className={getStatusBadgeClass(selectedOrder.dispatch.status)}>
                        {formatStatus(selectedOrder.dispatch.status)}
                      </Badge>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Admin view is read-only.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
