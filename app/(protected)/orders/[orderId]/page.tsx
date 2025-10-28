'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersService, type OrderDTO } from '@/features/orders/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OTPModal } from '@/components/dispatch/OTPModal';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { socketService } from '@/lib/socketService';
import { toast } from 'sonner';

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const router = useRouter();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);
  const [isReadyPending, setIsReadyPending] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const load = async () => {
    try {
      const data = await ordersService.getOrderUnified(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
    }
  };

  useEffect(() => {
    load();
    
    // Join socket room
    socketService.joinOrder(orderId);
    
    // Setup socket listeners
    const s = socketService.getSocket();
    const handleOrderUpdated = (payload: OrderDTO) => {
      if (payload.orderId === orderId) {
        console.log('Order updated via socket:', payload);
        setOrder(payload);
      }
    };

    const handleDispatchUpdated = (payload: any) => {
      console.log('Dispatch updated (fallback):', payload);
      // Fallback handler - backend prefers order.updated
    };

    s?.on('order.updated', handleOrderUpdated);
    s?.on('order:updated', handleOrderUpdated);
    s?.on('dispatch:updated', handleDispatchUpdated);

    // Setup polling fallback for offline mode or socket disconnect
    const pollInterval = setInterval(() => {
      if (!socketService.isConnected() || !pollInterval) {
        load(); // Poll every 60s if disconnected
      }
    }, 60000);
    setPollInterval(pollInterval);

    return () => {
      s?.off('order.updated', handleOrderUpdated);
      s?.off('order:updated', handleOrderUpdated);
      s?.off('dispatch:updated', handleDispatchUpdated);
      socketService.leaveOrder(orderId);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  const markReady = async () => {
    if (!order || isReadyPending) return;
    
    try {
      setIsReadyPending(true);
      const updated = await ordersService.markOrderReady(order.orderId);
      setOrder(updated);
      toast.success('Order marked ready for dispatch');
    } catch (error: any) {
      console.error('Failed to mark order ready:', error);
      toast.error(error?.message || 'Failed to mark order ready');
    } finally {
      setIsReadyPending(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!order?.dispatch?.id) return;
    
    try {
      await ordersService.verifyDispatchOtp(order.dispatch.id, code);
      toast.success('Delivery confirmed');
      await load(); // Refresh order
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      toast.error(error?.message || 'OTP verification failed');
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleRedispatch = async () => {
    await markReady();
  };

  const isLoading = loading && !order;

  return (
    <div className="space-y-6 p-2 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {order?.orderCode || `Order ${order?.orderId || orderId}`}
          </h1>
          {order?.traceId && (
            <p className="text-xs text-muted-foreground">Trace: {order.traceId}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{order?.orderStatus || 'Loading...'}</Badge>
          <Badge variant="outline">{order?.paymentStatus || '—'}</Badge>
          {order?.isConfirmed && (
            <Badge variant="secondary">Confirmed</Badge>
          )}
          {order?.dispatchStatus && (
            <Badge className={
              order.dispatchStatus === 'DELIVERED' ? 'bg-green-100 text-green-800' :
              order.dispatchStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
              order.dispatchStatus === 'CANCELED' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }>
              {order.dispatchStatus}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !order ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Order not found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {/* Mark Ready for Dispatch */}
              {order.isReadyForDispatch && order.paymentStatus === 'Paid' && order.dispatchStatus !== 'BOOKED' && (
                <Button onClick={markReady} disabled={isReadyPending}>
                  Mark Ready for Dispatch
                </Button>
              )}

              {/* OTP Verification */}
              {order.dispatchStatus === 'IN_TRANSIT' && (
                <Button variant="outline" onClick={() => setOtpOpen(true)}>
                  Confirm Delivery (OTP)
                </Button>
              )}

              {/* Re-dispatch */}
              {(order.dispatchStatus === 'FAILED' || order.dispatchStatus === 'CANCELED') && (
                <Button variant="outline" onClick={handleRedispatch} disabled={isReadyPending}>
                  Re-dispatch
                </Button>
              )}

              {/* Cancel Dispatch */}
              {(order.dispatchStatus === 'BOOKED' || order.dispatchStatus === 'ASSIGNED') && (
                <Button variant="destructive" onClick={async () => {
                  if (confirm('Cancel this dispatch?')) {
                    try {
                      await ordersService.cancelDispatch(order.orderId);
                      toast.success('Dispatch cancelled');
                      await load();
                    } catch (error: any) {
                      toast.error(error?.message || 'Failed to cancel dispatch');
                    }
                  }
                }}>
                  Cancel Dispatch
                </Button>
              )}
            </CardContent>
          </Card>

          {order.events && order.events.length > 0 && (
            <OrderTimeline events={order.events} />
          )}

          {order.dispatch && (
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{order.dispatch.provider}</span>
                </div>
                {order.dispatch.trackingNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="font-mono text-sm">{order.dispatch.trackingNumber}</span>
                  </div>
                )}
                {order.dispatch.trackingUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tracking URL</span>
                    <a href={order.dispatch.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      View on {order.dispatch.provider}
                    </a>
                  </div>
                )}
                {order.dispatch.eta && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Est. Arrival</span>
                    <span>{new Date(order.dispatch.eta).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <OTPModal open={otpOpen} onOpenChange={setOtpOpen} onVerify={verifyOtp} />
        </>
      )}
    </div>
  );
}
