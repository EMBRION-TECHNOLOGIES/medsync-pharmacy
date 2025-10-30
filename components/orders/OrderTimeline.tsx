'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, CreditCard, Truck, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface OrderEvent {
  type: string;
  at: string;
}

interface OrderTimelineProps {
  events: OrderEvent[];
}

const eventIcons = {
  OrderCreated: Package,
  ORDER_CREATED: Package,
  PaymentCaptured: CreditCard,
  PAYMENT_CAPTURED: CreditCard,
  OrderPrepared: Package,
  ORDER_PREPARED: Package,
  ORDER_DISPENSED: Package, // Backend sends this for PREPARED status
  DispatchBooked: Truck,
  DISPATCH_BOOKED: Truck,
  Delivered: CheckCircle,
  DELIVERED: CheckCircle,
  Cancelled: MapPin,
  CANCELLED: MapPin,
};

const eventLabels = {
  OrderCreated: 'Order Created',
  ORDER_CREATED: 'Order Created',
  PaymentCaptured: 'Payment Captured',
  PAYMENT_CAPTURED: 'Payment Captured',
  OrderPrepared: 'Order Prepared',
  ORDER_PREPARED: 'Order Prepared',
  ORDER_DISPENSED: 'Order Prepared', // Backend sends this for PREPARED status
  DispatchBooked: 'Dispatch Booked',
  DISPATCH_BOOKED: 'Dispatch Booked',
  Delivered: 'Delivered',
  DELIVERED: 'Delivered',
  Cancelled: 'Cancelled',
  CANCELLED: 'Cancelled',
};

// Helper to format any event type to readable text
function formatEventType(type: string): string {
  // Check predefined labels first
  if (eventLabels[type as keyof typeof eventLabels]) {
    return eventLabels[type as keyof typeof eventLabels];
  }
  
  // Convert SCREAMING_SNAKE_CASE or snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No events yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {events.map((event, idx) => {
            const Icon = eventIcons[event.type as keyof typeof eventIcons] || Package;
            const label = formatEventType(event.type);

            return (
              <div key={idx} className="flex items-start gap-3 relative">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 pb-4 border-l-2 border-muted pl-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

