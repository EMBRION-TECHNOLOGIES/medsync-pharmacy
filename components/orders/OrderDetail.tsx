'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Order } from '@/lib/zod-schemas';
import { useDispenseOrder } from '@/features/orders/hooks';
import { socketService } from '@/lib/socketService';
import { format } from 'date-fns';
import { Package, User, Calendar } from 'lucide-react';

interface OrderDetailProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetail({ order, open, onOpenChange }: OrderDetailProps) {
  const dispense = useDispenseOrder();
  
  // Join consolidated order room for live updates
  if (order?.id) {
    try {
      socketService.joinOrder(order.id);
    } catch {}
  }

  if (!order) return null;

  const canDispense = order.status?.toLowerCase() === 'confirmed';

  const handleDispense = () => {
    const items = order.items.map((item) => ({
      drugId: item.drugId,
      qty: item.quantity,
    }));
    dispense.mutate({ id: order.id, items });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details
          </DialogTitle>
          <DialogDescription>
            Order ID: {order.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge>{order.status}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>

          <Separator />

          {/* Patient Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Patient Information
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">ID:</span>{' '}
                {order.patientAlias || order.patientId}
              </p>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4" />
              Order Items
            </div>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.drugName}</p>
                    <p className="text-sm text-muted-foreground">
                      Drug ID: {item.drugId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Qty: {item.quantity} {item.unit || 'tablets'}
                    </p>
                    {item.priceNgn && (
                      <p className="text-sm text-muted-foreground">
                        ₦{item.priceNgn.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {order.status?.toLowerCase() === 'pending' && (
              <div className="text-sm text-muted-foreground">
                ⏳ Waiting for patient to confirm order in their mobile app
              </div>
            )}
            {canDispense && (
              <Button
                onClick={handleDispense}
                disabled={dispense.isPending}
                className="ms-gradient"
              >
                <Package className="h-4 w-4 mr-2" />
                Mark as Prepared
              </Button>
            )}
            {order.status?.toLowerCase() === 'prepared' && (
              <div className="text-sm text-muted-foreground">
                ✨ Order ready on counter — waiting for patient payment (will auto-trigger dispatch)
              </div>
            )}
            {order.status?.toLowerCase() === 'dispensed' && (
              <div className="text-sm text-muted-foreground">
                💊 Dispensed — ready for dispatch
              </div>
            )}
            {order.status?.toLowerCase() === 'out_for_delivery' && (
              <div className="text-sm text-muted-foreground">
                🚚 Order is out for delivery
              </div>
            )}
            {order.status?.toLowerCase() === 'delivered' && (
              <div className="text-sm text-green-600">
                ✅ Order delivered successfully
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

