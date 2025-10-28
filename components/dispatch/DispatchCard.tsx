'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dispatch } from '@/lib/zod-schemas';
import { Truck, MapPin, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';

interface DispatchCardProps {
  dispatch: Dispatch;
  onViewDetails?: (dispatch: Dispatch) => void;
}

const statusColors: Record<string, string> = {
  BOOKED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELED: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  BOOKED: 'Booked',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
};

export function DispatchCard({ dispatch, onViewDetails }: DispatchCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {dispatch.provider.charAt(0).toUpperCase() + dispatch.provider.slice(1)} Delivery
          </CardTitle>
          <Badge className={statusColors[dispatch.status] || 'bg-gray-100 text-gray-800'}>
            {statusLabels[dispatch.status] || dispatch.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Pickup</p>
               <p className="text-muted-foreground">{dispatch.pickupLocation?.address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-ms-green mt-0.5" />
            <div>
              <p className="font-medium">Dropoff</p>
              <p className="text-muted-foreground">{dispatch.deliveryLocation?.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(new Date(dispatch.createdAt), 'MMM dd, HH:mm')}
          </div>
          {dispatch.otp && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-4 w-4" />
              OTP: <span className="font-mono font-bold">{dispatch.otp}</span>
            </div>
          )}
        </div>

        {onViewDetails && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onViewDetails(dispatch)}
          >
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

