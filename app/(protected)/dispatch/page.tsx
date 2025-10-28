'use client';

import { useDispatchRequests, useDeliveryHistory } from '@/features/dispatch/hooks';
import { useOrders } from '@/features/orders/hooks';
import { useDispatchSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useOrg } from '@/store/useOrg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package } from 'lucide-react';
import { useState } from 'react';

export default function DispatchPage() {
  const { pharmacyId, locationId } = useOrg();
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | undefined>();
  
  // Get orders that have confirmed status (ready for dispatch)
  const { data: orders } = useOrders({
    status: 'CONFIRMED',
  });

  // Get dispatch requests
  const { data: dispatchRequests, isLoading: requestsLoading } = useDispatchRequests({});

  // Get delivery history
  const { data: deliveryHistory, isLoading: historyLoading } = useDeliveryHistory({});

  // Use new socket hook for dispatch tracking
  useDispatchSocket(selectedDispatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispatch</h1>
        <p className="text-muted-foreground">
          Manage delivery logistics and tracking
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders Ready for Dispatch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders Ready for Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders?.orders && orders.orders.length > 0 ? (
              <div className="space-y-2">
                {orders.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {order.patient.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.drugName}
                      </p>
                    </div>
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No orders ready for dispatch
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Dispatches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Active Dispatches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dispatchRequests && dispatchRequests.length > 0 ? (
              <div className="space-y-3">
                {dispatchRequests.map((dispatch: unknown) => {
                  const d = dispatch as { id: string; provider: string; status: string };
                  return (
                  <div 
                    key={d.id} 
                    className={`border rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedDispatchId === d.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDispatchId(d.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {d.provider.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Status: {d.status}
                    </p>
                    {selectedDispatchId === d.id && (
                      <p className="text-xs text-primary mt-1">
                        🔴 Live tracking enabled
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active dispatches
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Dispatches */}
      {dispatchRequests && dispatchRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Dispatches</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dispatchRequests.map((dispatch: unknown) => {
              const d = dispatch as { id: string; [key: string]: unknown };
              return (
                <div key={d.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">Dispatch {d.id}</h3>
                  <p className="text-sm text-muted-foreground">Status: {(d as { status?: string }).status || 'Unknown'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

