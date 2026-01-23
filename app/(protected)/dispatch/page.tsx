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
import { useRouter } from 'next/navigation';
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
    totalAmount?: number | string; // 🔥 Total order price (medication + delivery + fees)
    priceNgn?: number | string; // Medication price only (for reference)
    priceBreakdown?: any; // Price breakdown JSON (optional)
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
  const router = useRouter();
  const config = statusConfig[dispatch.status] || statusConfig.CREATED;
  const isActive = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(dispatch.status);
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Navigate to order details page
    router.push(`/orders/${dispatch.order.id}`);
  };
  
  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${isActive ? 'border-l-4 border-l-yellow-500' : ''}`}
      onClick={handleCardClick}
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
  const router = useRouter();
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Navigate to order details page
    router.push(`/orders/${order.id}`);
  };
  
  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
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
      <ArrowRight className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
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
  const router = useRouter();
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

  // #region agent log
  if (typeof window !== 'undefined') {
    try {
      const rawValue = deliveryHistory ? JSON.stringify(deliveryHistory).substring(0,500) : 'null';
      fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch/page.tsx:deliveryHistory',message:'History query result',data:{deliveryHistoryType:typeof deliveryHistory,isArray:Array.isArray(deliveryHistory),hasData:!!deliveryHistory?.data,isLoading:historyLoading,rawKeys:deliveryHistory?Object.keys(deliveryHistory):[],rawValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
    } catch(e) {
      fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch/page.tsx:deliveryHistory:ERROR',message:'Error logging deliveryHistory',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
    }
  }
  // #endregion

  // Use new socket hook for dispatch tracking
  useDispatchSocket(selectedDispatchId);

  // Parse dispatch data
  // Backend returns: { requests: [...], total, page, limit, totalPages }
  // After interceptor unwrapping, dispatchRequests is the data object
  const dispatches: DispatchRecord[] = Array.isArray(dispatchRequests) 
    ? dispatchRequests 
    : (dispatchRequests as any)?.requests || (dispatchRequests as any)?.data || [];
    
  // 🔥 FIX: Parse history correctly - API returns { success: true, data: [...] }
  // After interceptor: { data: [...], page, pageSize, total }
  // But logs show: { dispatches: [], pagination: {...} }
  // Handle both formats
  const historyRaw: DispatchRecord[] = Array.isArray(deliveryHistory)
    ? deliveryHistory
    : Array.isArray((deliveryHistory as any)?.data)
    ? (deliveryHistory as any).data
    : Array.isArray((deliveryHistory as any)?.dispatches)
    ? (deliveryHistory as any).dispatches
    : (deliveryHistory as any)?.requests || [];
  
  // 🔥 FIX: Sort history by deliveredAt (most recent first), fallback to createdAt
  const history: DispatchRecord[] = [...historyRaw].sort((a, b) => {
    // Use deliveredAt if available, otherwise use createdAt
    const dateA = a.deliveredAt ? new Date(a.deliveredAt).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.deliveredAt ? new Date(b.deliveredAt).getTime() : new Date(b.createdAt).getTime();
    // Sort descending (most recent first)
    return dateB - dateA;
  });
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch/page.tsx:historyParsed',message:'History parsed and sorted',data:{historyLength:history.length,historyStatuses:history.map(d=>d.status),deliveredCount:history.filter(d=>d.status==='DELIVERED').length,sortedDates:history.slice(0,5).map(d=>({id:d.id,deliveredAt:d.deliveredAt,createdAt:d.createdAt}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
  }
  // #endregion

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dispatch Debug:', {
      dispatchRequestsRaw: dispatchRequests,
      dispatchesParsed: dispatches,
      dispatchesCount: dispatches.length,
      activeDispatchesCount: dispatches.filter(d => 
        ['CREATED', 'QUOTED', 'BOOKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
      ).length,
    });
  }

  // Filter active dispatches
  const activeDispatches = dispatches.filter(d => 
    ['CREATED', 'QUOTED', 'BOOKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  );
  
  const inTransitCount = dispatches.filter(d => 
    ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  ).length;
  
  // 🔥 FIX: Calculate "Delivered Today" - filter by today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveredToday = history.filter(d => {
    if (d.status !== 'DELIVERED') return false;
    // Use deliveredAt if available, otherwise fall back to createdAt
    const deliveryDate = d.deliveredAt ? new Date(d.deliveredAt) : new Date(d.createdAt);
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() === today.getTime();
  }).length;
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch/page.tsx:deliveredToday',message:'Delivered today calculation',data:{todayISO:today.toISOString(),deliveredToday,allDelivered:history.filter(d=>d.status==='DELIVERED').map(d=>({id:d.id,deliveredAt:d.deliveredAt,createdAt:d.createdAt,deliveredDateISO:d.deliveredAt?new Date(d.deliveredAt).setHours(0,0,0,0):null}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion
  
  const deliveredCount = deliveredToday; // Use today's count for the card
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dispatch History Debug:', {
      deliveryHistoryRaw: deliveryHistory,
      historyParsed: history,
      historyLength: history.length,
      deliveredToday,
      today: today.toISOString(),
      deliveredDispatches: history.filter(d => d.status === 'DELIVERED').map(d => ({
        id: d.id,
        status: d.status,
        deliveredAt: d.deliveredAt,
        createdAt: d.createdAt,
        orderCode: d.order?.orderCode
      }))
    });
  }
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
                      
                      const handleHistoryClick = () => {
                        router.push(`/orders/${dispatch.order.id}`);
                      };
                      
                      return (
                        <div 
                          key={dispatch.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={handleHistoryClick}
                        >
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
                          {(() => {
                            // 🔥 FIX: Display medication price only (not total order with fees)
                            // priceNgn is in Naira (not kobo), so no division needed
                            const medicationPrice = dispatch.order.priceNgn 
                              ? typeof dispatch.order.priceNgn === 'string' 
                                ? parseFloat(dispatch.order.priceNgn) 
                                : dispatch.order.priceNgn
                              : null;
                            
                            // Fallback to deliveryCharge if priceNgn not available (backward compatibility)
                            const displayPrice = medicationPrice ?? (dispatch.deliveryCharge ? dispatch.deliveryCharge / 100 : null);
                            
                            return displayPrice ? (
                              <p className="text-sm font-medium">
                                ₦{displayPrice.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : null;
                          })()}
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
