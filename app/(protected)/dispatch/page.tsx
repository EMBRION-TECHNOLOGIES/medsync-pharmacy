'use client';

import { useDispatchRequests, useDeliveryHistory } from '@/features/dispatch/hooks';
import { useOrders } from '@/features/orders/hooks';
import { useDispatchSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useOrg } from '@/store/useOrg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Phone,
  User,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  History
} from 'lucide-react';
import { useState } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { format, formatDistanceToNow } from 'date-fns';

type DispatchStatus = 'CREATED' | 'QUOTED' | 'BOOKED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELED' | 'FAILED';

interface DispatchRecord {
  id: string;
  provider: string;
  status: DispatchStatus;
  deliveryCharge?: number;
  otp?: string;
  driverPhoneMasked?: string;
  createdAt: string;
  deliveredAt?: string;
  quoteJSON?: {
    estimatedTime?: number;
    distance?: string;
    vehicleType?: string;
  };
  order: {
    id: string;
    orderCode: string;
    drugName: string;
    status: string;
    deliveryAddress: string;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      medSyncId?: string;
    };
  };
  pharmacyLocation: {
    id: string;
    name: string;
    address: string;
  };
}

const statusConfig: Record<DispatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  CREATED: { label: 'Created', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
  QUOTED: { label: 'Quoted', color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
  BOOKED: { label: 'Booked', color: 'bg-indigo-100 text-indigo-800', icon: <Package className="h-3 w-3" /> },
  ASSIGNED: { label: 'Driver Assigned', color: 'bg-purple-100 text-purple-800', icon: <User className="h-3 w-3" /> },
  PICKED_UP: { label: 'Picked Up', color: 'bg-orange-100 text-orange-800', icon: <Package className="h-3 w-3" /> },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-800', icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
};

function DispatchCard({ dispatch, isSelected, onSelect }: { 
  dispatch: DispatchRecord; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = statusConfig[dispatch.status] || statusConfig.CREATED;
  const isActive = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(dispatch.status);
  
  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${isActive ? 'border-l-4 border-l-yellow-500' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{dispatch.order.orderCode}</p>
          <p className="text-xs text-muted-foreground">{dispatch.order.drugName}</p>
        </div>
        <Badge className={`${config.color} flex items-center gap-1`}>
          {config.icon}
          {config.label}
        </Badge>
      </div>
      
      <div className="space-y-2 text-xs">
        {dispatch.order.patient && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              {dispatch.order.patient.medSyncId || `${dispatch.order.patient.firstName} ${dispatch.order.patient.lastName}`}
            </span>
          </div>
        )}
        
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{dispatch.order.deliveryAddress}</span>
        </div>
        
        {dispatch.quoteJSON?.estimatedTime && isActive && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>ETA: {dispatch.quoteJSON.estimatedTime} mins</span>
          </div>
        )}
        
        {dispatch.driverPhoneMasked && isActive && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{dispatch.driverPhoneMasked}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(dispatch.createdAt), { addSuffix: true })}
        </span>
        <span className="text-xs font-medium text-primary">
          {dispatch.provider}
        </span>
      </div>
      
      {isSelected && isActive && (
        <div className="mt-3 pt-3 border-t bg-primary/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live tracking enabled
          </p>
          {dispatch.otp && (
            <p className="text-xs mt-1">
              Delivery OTP: <span className="font-mono font-bold">{dispatch.otp}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OrderReadyCard({ order }: { order: any }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">
            {order.orderCode || order.id.slice(0, 8)}
          </p>
          <Badge variant="outline" className="text-xs">
            {order.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {order.drugName}
        </p>
        {order.patient?.medSyncId && (
          <p className="text-xs text-muted-foreground">
            Patient: {order.patient.medSyncId}
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" className="ml-2 shrink-0">
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StatsCard({ title, value, icon, description }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DispatchPage() {
  const { pharmacyId, locationId } = useOrg();
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('active');
  
  // Get orders that have confirmed status (ready for dispatch)
  const { data: orders, refetch: refetchOrders } = useOrders({
    status: 'CONFIRMED',
  });

  // Get dispatch requests
  const { data: dispatchRequests, isLoading: requestsLoading, refetch: refetchDispatches } = useDispatchRequests({});

  // Get delivery history
  const { data: deliveryHistory, isLoading: historyLoading, refetch: refetchHistory } = useDeliveryHistory({});

  // Use new socket hook for dispatch tracking
  useDispatchSocket(selectedDispatchId);

  // Parse dispatch data
  const dispatches: DispatchRecord[] = Array.isArray(dispatchRequests) 
    ? dispatchRequests 
    : (dispatchRequests as any)?.data || [];
    
  const history: DispatchRecord[] = Array.isArray(deliveryHistory)
    ? deliveryHistory
    : (deliveryHistory as any)?.data || [];

  // Filter active dispatches
  const activeDispatches = dispatches.filter(d => 
    ['CREATED', 'QUOTED', 'BOOKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  );
  
  const inTransitCount = dispatches.filter(d => 
    ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  ).length;
  
  const deliveredCount = history.filter(d => d.status === 'DELIVERED').length;
  const readyForDispatchCount = orders?.orders?.length || 0;

  const handleRefresh = () => {
    refetchOrders();
    refetchDispatches();
    refetchHistory();
  };

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST', 'STAFF']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dispatch</h1>
            <p className="text-muted-foreground">
              Manage delivery logistics and tracking
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard 
            title="Ready for Dispatch" 
            value={readyForDispatchCount}
            icon={<Package className="h-6 w-6 text-primary" />}
            description="Orders awaiting dispatch"
          />
          <StatsCard 
            title="In Transit" 
            value={inTransitCount}
            icon={<Truck className="h-6 w-6 text-yellow-600" />}
            description="Currently being delivered"
          />
          <StatsCard 
            title="Active Dispatches" 
            value={activeDispatches.length}
            icon={<Clock className="h-6 w-6 text-blue-600" />}
            description="All ongoing dispatches"
          />
          <StatsCard 
            title="Delivered Today" 
            value={deliveredCount}
            icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
            description="Successfully completed"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Active Dispatches
              {activeDispatches.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeDispatches.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ready for Dispatch
              {readyForDispatchCount > 0 && (
                <Badge variant="secondary" className="ml-1">{readyForDispatchCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {requestsLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading dispatches...</p>
                  </div>
                </CardContent>
              </Card>
            ) : activeDispatches.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeDispatches.map((dispatch) => (
                  <DispatchCard
                    key={dispatch.id}
                    dispatch={dispatch}
                    isSelected={selectedDispatchId === dispatch.id}
                    onSelect={() => setSelectedDispatchId(
                      selectedDispatchId === dispatch.id ? undefined : dispatch.id
                    )}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-1">No Active Dispatches</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      When you book deliveries for orders, they will appear here for tracking.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ready" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders Ready for Dispatch
                </CardTitle>
                <CardDescription>
                  These orders are confirmed and waiting to be dispatched
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders?.orders && orders.orders.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {orders.orders.map((order: any) => (
                      <OrderReadyCard key={order.id} order={order} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-1">No Orders Ready</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Orders will appear here once they are confirmed and ready for dispatch.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                  </div>
                </CardContent>
              </Card>
            ) : history.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Delivery History
                  </CardTitle>
                  <CardDescription>
                    Completed and cancelled deliveries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {history.map((dispatch) => {
                      const config = statusConfig[dispatch.status] || statusConfig.DELIVERED;
                      return (
                        <div key={dispatch.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{dispatch.order.orderCode}</p>
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dispatch.order.drugName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dispatch.deliveredAt 
                                ? `Delivered ${format(new Date(dispatch.deliveredAt), 'MMM d, yyyy h:mm a')}`
                                : format(new Date(dispatch.createdAt), 'MMM d, yyyy h:mm a')
                              }
                            </p>
                          </div>
                          {dispatch.deliveryCharge && (
                            <p className="text-sm font-medium">
                              ₦{(dispatch.deliveryCharge / 100).toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-1">No Delivery History</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Completed deliveries will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
