'use client';

import { useEffect, useState, useCallback } from 'react';
import { ordersService, type OrderDTO } from '@/features/orders/service';
import { useOrg } from '@/store/useOrg';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatus } from '@/lib/zod-schemas';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function OrdersPage() {
  const { pharmacyId, locationId, locationName } = useOrg();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [total, setTotal] = useState(0);
  
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const load = useCallback(async () => {
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
  }, [pharmacyId, status, searchQuery, page, pageSize]);

  useEffect(() => {
    load();
  }, [load, locationId]); // Also refresh when locationId changes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            {locationName ? `Viewing ${locationName}` : 'Manage and track pharmacy orders'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
        <>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <OrdersTable
              orders={orders as any}
              onViewOrder={(o: any) => {
                window.location.href = `/orders/${o.orderId || o.id}`;
              }}
            />
          </div>
          
          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

