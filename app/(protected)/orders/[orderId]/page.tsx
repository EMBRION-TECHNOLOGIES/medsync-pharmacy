'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ordersService, type OrderDTO } from '@/features/orders/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OTPModal } from '@/components/dispatch/OTPModal';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { socketService } from '@/lib/socketService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);
  const [isReadyPending, setIsReadyPending] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [itemsModalOpen, setItemsModalOpen] = useState(false);

  const load = async () => {
    try {
      const data = await ordersService.getOrderUnified(orderId);
      console.log('📦 Loaded order:', { orderId: data.orderId, orderCode: data.orderCode, status: data.orderStatus });
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
          {/* Order Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Code</p>
                  <p className="font-medium">{order.orderCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{new Date(order.createdAt || '').toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{order.orderStatus}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge variant="outline">{order.paymentStatus}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient/Recipient Information */}
          <Card>
            <CardHeader>
              <CardTitle>Recipient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patient ID</span>
                <span className="font-medium">{order.patientMsid || order.patientId || '—'}</span>
              </div>
              {order.receiverName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receiver Name</span>
                  <span className="font-medium">{order.receiverName}</span>
                </div>
              )}
              {order.receiverPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{order.receiverPhone}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery Address</span>
                  <span className="font-medium text-right">{order.deliveryAddress}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-4">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.drugName}</p>
                          <p className="text-sm text-muted-foreground">{item.dosageSig}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">₦{Number(item.priceNgn || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t font-bold">
                    <span>Total Medication Price</span>
                    <span>₦{Number(order.priceNgn || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * Patient will see additional delivery & service fees in their mobile app
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {order.itemsCount ? `${order.itemsCount} medications` : order.quantity ? `${order.quantity} units` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.drugName || 'Multiple medications - see items'}
                      </p>
                    </div>
                    <p className="font-medium">₦{Number(order.priceNgn || 0).toLocaleString()}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setItemsModalOpen(true)}
                  >
                    View Item Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {/* Mark as Prepared - CONFIRMED → PREPARED */}
              {(() => {
                console.log('🔘 Button condition check:', {
                  orderStatus: order.orderStatus,
                  paymentStatus: order.paymentStatus,
                  isConfirmed: order.orderStatus === 'CONFIRMED',
                  isPaid: order.paymentStatus === 'Paid',
                  shouldShowButton: order.orderStatus === 'CONFIRMED' && order.paymentStatus !== 'Paid'
                });
                return null;
              })()}
              {order.orderStatus === 'CONFIRMED' && order.paymentStatus !== 'Paid' && (
                <Button onClick={async () => {
                  if (isReadyPending) return;
                  try {
                    setIsReadyPending(true);
                    const updated = await ordersService.markOrderReady(order.orderId);
                    setOrder(updated);
                    toast.success('Order marked as prepared');
                  } catch (error: any) {
                    console.error('Failed to mark order prepared:', error);
                    toast.error(error?.message || 'Failed to mark order prepared');
                  } finally {
                    setIsReadyPending(false);
                  }
                }} disabled={isReadyPending}>
                  Mark as Prepared
                </Button>
              )}

              {/* Mark Ready for Dispatch - PREPARED + Paid → Ready for Dispatch */}
              {(() => {
                const isPrepared = order.orderStatus === 'PREPARED';
                const isPaid = order.paymentStatus === 'success' || order.paymentStatus === 'Paid' || order.paymentStatus === 'completed';
                const notBooked = order.dispatchStatus !== 'BOOKED';
                
                console.log('🚚 Dispatch button check:', {
                  orderStatus: order.orderStatus,
                  isPrepared,
                  paymentStatus: order.paymentStatus,
                  isPaid,
                  dispatchStatus: order.dispatchStatus,
                  notBooked,
                  shouldShow: isPrepared && isPaid && notBooked
                });
                
                return isPrepared && isPaid && notBooked ? (
                <Button onClick={markReady} disabled={isReadyPending}>
                    📦 Book Dispatch
                </Button>
                ) : null;
              })()}

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
                {order?.items && order.items.length > 0 ? (
                  <>
                    {order.items.map((item: any, index: number) => (
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
                      <span className="text-2xl font-bold">₦{Number(order?.priceNgn || 0).toLocaleString()}</span>
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
        </>
      )}
    </div>
  );
}
