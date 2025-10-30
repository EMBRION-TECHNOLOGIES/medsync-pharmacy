'use client';

import { useEffect, useState } from 'react';
import { ordersService, type OrderDTO } from '@/features/orders/service';
import { useOrg } from '@/store/useOrg';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatus } from '@/lib/zod-schemas';
import { Search, Filter } from 'lucide-react';

export default function OrdersPage() {
  const { pharmacyId } = useOrg();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const res = await ordersService.getOrdersUnified({
        status,
        search: searchQuery,
        page,
        limit: pageSize,
      });
      
      // DEBUG: Log the orders to see patient data
      console.log('🔍 Orders loaded:', res.data);
      if (res.data && res.data.length > 0) {
        console.log('🔍 First order patient data:', res.data[0].patientMsid, res.data[0]);
      }
      
      setOrders(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, status, searchQuery, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage and track pharmacy orders
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <OrdersTable
          orders={orders as any}
          onViewOrder={(o: any) => {
            window.location.href = `/orders/${o.orderId || o.id}`;
          }}
        />
      )}
    </div>
  );
}

