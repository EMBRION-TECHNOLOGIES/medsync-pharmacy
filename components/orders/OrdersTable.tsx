'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/lib/zod-schemas';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

type AnyOrder = any;
interface OrdersTableProps {
  orders: AnyOrder[];
  onViewOrder: (order: AnyOrder) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  dispensed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
};

export function OrdersTable({ orders, onViewOrder }: OrdersTableProps) {
  // Handle undefined orders
  const safeOrders = orders || [];
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            safeOrders.map((order) => (
              <TableRow key={(order.id || order.orderId)}>
                <TableCell className="font-mono text-sm">
                  {(order.id || order.orderId).slice(0, 8)}...
                </TableCell>
                <TableCell>
                  {order.patientAlias || order.patientId || '—'}
                </TableCell>
                <TableCell>
                  {order.items ? `${order.items.length} item${order.items.length !== 1 ? 's' : ''}` : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge className={statusColors[(order.status || order.orderStatus || '').toLowerCase() as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                      {order.status || order.orderStatus || '—'}
                    </Badge>
                    {order.isConfirmed && (
                      <Badge variant="secondary" className="text-xs">
                        Confirmed
                      </Badge>
                    )}
                    {order.dispatchStatus && (
                      <Badge variant="outline" className="text-xs">
                        {order.dispatchStatus}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt || order.updatedAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewOrder(order)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

