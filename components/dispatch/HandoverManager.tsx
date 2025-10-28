'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  Clock, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Copy,
  QrCode
} from 'lucide-react';
import { useUpdateDispatchStatus } from '@/features/dispatch/hooks';
import { Dispatch } from '@/lib/zod-schemas';
import { toast } from 'sonner';

interface HandoverManagerProps {
  dispatch: Dispatch;
  onHandoverConfirmed: () => void;
}

export function HandoverManager({ dispatch, onHandoverConfirmed }: HandoverManagerProps) {
  const [handoverCode, setHandoverCode] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const updateDispatchStatus = useUpdateDispatchStatus();

  const handleConfirmHandover = async () => {
    if (!handoverCode.trim()) {
      toast.error('Please enter the handover code');
      return;
    }

    try {
      await updateDispatchStatus.mutateAsync({
        requestId: dispatch.id,
        status: 'DELIVERED',
      });
      onHandoverConfirmed();
      setHandoverCode('');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const copyHandoverCode = () => {
    const handoverCode = (dispatch as { handoverCode?: string }).handoverCode || '';
    navigator.clipboard.writeText(handoverCode);
    toast.success('Handover code copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <AlertCircle className="h-4 w-4" />;
      case 'picked_up': return <CheckCircle className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const isHandoverRequired = dispatch.status === 'accepted' && !dispatch.actualPickupTime;

  return (
    <div className="space-y-6">
      {/* Dispatch Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Dispatch Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge className={`${getStatusColor(dispatch.status)} flex items-center gap-1`}>
              {getStatusIcon(dispatch.status)}
              {dispatch.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          {dispatch.driver && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Driver Details</span>
              </div>
              <div className="pl-6 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{dispatch.driver.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{dispatch.driver.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vehicle:</span>
                  <span className="text-sm">{dispatch.driver.vehicle} ({dispatch.driver.plateNumber})</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Locations</span>
            </div>
            <div className="pl-6 space-y-1">
              <div>
                <span className="text-sm text-muted-foreground">Pickup:</span>
                 <p className="text-sm">{dispatch.pickupAddress}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Delivery:</span>
                <p className="text-sm">{dispatch.dropoffAddress}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handover Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Handover Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Code:</span>
            <div className="flex items-center gap-2">
              <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                {dispatch.handoverCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyHandoverCode}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Share this code with the driver to confirm pickup. The driver will need to enter this code to complete the handover.
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQRCode(true)}
              className="flex-1"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Show QR Code
            </Button>
            <Button
              variant="outline"
              onClick={copyHandoverCode}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Handover Confirmation */}
      {isHandoverRequired && (
        <Card className="border-ms-yellow/20 bg-ms-yellow/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ms-yellow">
              <AlertCircle className="h-5 w-5" />
              Confirm Handover
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              The driver has arrived and is ready to pick up the order. Please confirm the handover by entering the code below.
            </div>

            <div className="space-y-2">
              <Label htmlFor="handover-code">Enter Handover Code</Label>
              <div className="flex gap-2">
                <Input
                  id="handover-code"
                  value={handoverCode}
                  onChange={(e) => setHandoverCode(e.target.value.toUpperCase())}
                  placeholder="Enter code from driver"
                  className="flex-1"
                  maxLength={6}
                />
                <Button
                  onClick={handleConfirmHandover}
                  disabled={confirmHandover.isPending || !handoverCode.trim()}
                  className="bg-ms-yellow hover:bg-ms-yellow/90"
                >
                  {confirmHandover.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tracking Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Estimated Pickup:</span>
              <p className="text-sm font-medium">
                 {dispatch.estimatedPickupTime ? new Date(dispatch.estimatedPickupTime).toLocaleString() : 'Not set'}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estimated Delivery:</span>
              <p className="text-sm font-medium">
                 {dispatch.estimatedDeliveryTime ? new Date(dispatch.estimatedDeliveryTime).toLocaleString() : 'Not set'}
              </p>
            </div>
            {dispatch.actualPickupTime && (
              <div>
                <span className="text-sm text-muted-foreground">Actual Pickup:</span>
                <p className="text-sm font-medium text-green-600">
                  {new Date(dispatch.actualPickupTime).toLocaleString()}
                </p>
              </div>
            )}
            {dispatch.actualDeliveryTime && (
              <div>
                <span className="text-sm text-muted-foreground">Actual Delivery:</span>
                <p className="text-sm font-medium text-green-600">
                  {new Date(dispatch.actualDeliveryTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {dispatch.trackingUrl && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => window.open(dispatch.trackingUrl, '_blank')}
                className="w-full"
              >
                <Truck className="h-4 w-4 mr-2" />
                Track Delivery
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Handover QR Code</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="bg-muted p-8 rounded-lg">
              <QrCode className="h-32 w-32 mx-auto text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Driver can scan this QR code to get the handover code
              </p>
              <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                {dispatch.handoverCode}
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
