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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

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
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const handleViewItems = (order: any) => {
    setSelectedOrder(order);
    setItemsModalOpen(true);
  };
  
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
            safeOrders.map((order) => {
              // DEBUG: Log order data
              console.log('🔍 Order data in table:', {
                orderId: order.orderId,
                patientMsid: order.patientMsid,
                patientId: order.patientId,
                fullOrder: order
              });
              
              // Smart patient display - prioritize MedSync ID
              const patientDisplay = order.patientMsid || 
                                    order.patientAlias || 
                                    (order.patientId ? `MD-${order.patientId.slice(-8).toUpperCase()}` : 'Unknown');
              
              // Smart items display
              let itemsDisplay = '—';
              if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                if (order.items.length === 1) {
                  const item = order.items[0];
                  itemsDisplay = `${item.drugName} x${item.quantity}`;
                } else {
                  itemsDisplay = `${order.items.length} medications`;
                }
              } else if (order.drugName) {
                // Fallback to single drug field
                itemsDisplay = `${order.drugName}${order.quantity ? ` x${order.quantity}` : ''}`;
              }
              
              return (
                <TableRow key={(order.id || order.orderId)}>
                  <TableCell className="font-mono text-sm">
                    {(order.id || order.orderId).slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {patientDisplay}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="max-w-xs truncate" title={itemsDisplay}>
                    {itemsDisplay}
                      </span>
                      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewItems(order)}
                          className="h-6 px-2 text-xs"
                        >
                          View
                        </Button>
                      )}
                    </div>
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
            );
            })
          )}
        </TableBody>
      </Table>

      {/* Items Details Modal */}
      <Dialog open={itemsModalOpen} onOpenChange={setItemsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Items</DialogTitle>
            <DialogDescription>
              Detailed view of all medications in this order
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {selectedOrder?.items && selectedOrder.items.length > 0 ? (
              <>
                {selectedOrder.items.map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{item.drugName || 'Unknown Drug'}</h4>
                        {item.dosageSig && (
                          <p className="text-sm text-muted-foreground mt-1">{item.dosageSig}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Quantity: <span className="font-medium">{item.quantity}</span>
                          </span>
                          {item.drugId && (
                            <span className="text-muted-foreground">
                              Drug ID: <span className="font-mono text-xs">{item.drugId}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">₦{Number(item.priceNgn || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Medication Price</span>
                  <span className="text-2xl font-bold">₦{Number(selectedOrder?.priceNgn || 0).toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items found in this order</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

