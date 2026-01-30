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
import { Package, User, Calendar, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrderDetailProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Safe date formatter — handles ISO strings, Date, timestamps, null/undefined
function formatDate(date: string | Date | number | null | undefined): string {
  if (date == null || date === '') return 'N/A';
  try {
    const dateObj =
      typeof date === 'number'
        ? new Date(date)
        : typeof date === 'string'
          ? new Date(date)
          : date instanceof Date
            ? date
            : new Date(String(date));
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'N/A';
  }
}

export function OrderDetail({ order, open, onOpenChange }: OrderDetailProps) {
  const dispense = useDispenseOrder();
  const router = useRouter();
  const orderId = (order as any)?.id ?? (order as any)?.orderId;

  // Join consolidated order room for live updates
  if (orderId) {
    try {
      socketService.joinOrder(orderId);
    } catch {}
  }

  if (!order) return null;

  const orderStatus = ((order as any).status ?? (order as any).orderStatus ?? '').toString().toUpperCase();
  const canDispense = orderStatus === 'CONFIRMED' && orderStatus !== 'PREPARED' && orderStatus !== 'DISPENSED' && orderStatus !== 'DELIVERED';
  // Date: support both camelCase and snake_case from API
  const displayDate =
    (order as any).createdAt ??
    (order as any).created_at ??
    (order as any).updatedAt ??
    (order as any).updated_at;
  const orderCode = (order as any).orderCode ?? (order as any).order_code;

  const handleDispense = () => {
    const items = ((order as any).items ?? []).map((item: any) => ({
      drugId: item.drugId,
      qty: item.quantity,
    }));
    dispense.mutate({ id: orderId, items });
  };

  const handleViewFullDetails = () => {
    onOpenChange(false);
    router.push(`/orders/${orderId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details
          </DialogTitle>
          <DialogDescription className="space-y-1">
            {orderCode && (
              <span className="block font-medium text-foreground">Order: {orderCode}</span>
            )}
            <span className="block text-xs text-muted-foreground">ID: {order.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge>{orderStatus}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(displayDate)}
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
                <span className="text-muted-foreground">MedSync ID:</span>{' '}
                {(order as any).patient?.medSyncId ?? (order as any).patientMsid ?? (order as any).patientAlias ?? '—'}
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
              {((order as any).items ?? []).map((item: any, index: number) => (
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
                      Qty: {item.quantity} {item.unit || 'units'}
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
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 justify-between items-center">
              <div className="flex-1">
                {orderStatus === 'PENDING' && (
                  <div className="text-sm text-muted-foreground">
                    ⏳ Waiting for patient to confirm order in their mobile app
                  </div>
                )}
                {orderStatus === 'PREPARED' && (
                  <div className="text-sm text-muted-foreground">
                    ✨ Order ready on counter — waiting for patient payment (will auto-trigger dispatch)
                  </div>
                )}
                {orderStatus === 'DISPENSED' && (
                  <div className="text-sm text-muted-foreground">
                    💊 Dispensed — ready for dispatch
                  </div>
                )}
                {orderStatus === 'OUT_FOR_DELIVERY' && (
                  <div className="text-sm text-muted-foreground">
                    🚚 Order is out for delivery
                  </div>
                )}
                {orderStatus === 'DELIVERED' && (
                  <div className="text-sm text-green-600">
                    ✅ Order delivered successfully
                  </div>
                )}
              </div>
              <div className="flex gap-2">
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
                <Button
                  onClick={handleViewFullDetails}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Full Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

