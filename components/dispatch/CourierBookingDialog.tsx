'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, MapPin, Clock, Phone, AlertTriangle } from 'lucide-react';
import { useBookDelivery } from '@/features/dispatch/hooks';
import { BookDeliveryRequest } from '@/features/dispatch/service';
import { toast } from 'sonner';

interface CourierBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderValue: number;
  pharmacyLocation: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
}

export function CourierBookingDialog({
  open,
  onOpenChange,
  orderId,
  orderValue,
  pharmacyLocation,
}: CourierBookingDialogProps) {
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    specialInstructions: '',
    urgency: 'normal' as 'normal' | 'urgent' | 'emergency',
    provider: 'auto' as 'kwik' | 'gokada' | 'auto',
  });

  const bookDelivery = useBookDelivery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.street || !formData.city || !formData.state || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    const bookingData: BookDeliveryRequest = {
      orderId,
      pharmacyId: pharmacyLocation.id,
      deliveryAddress: {
        latitude: 6.4281, // Victoria Island coordinates
        longitude: 3.4219,
        address: `${formData.street}, ${formData.city}, ${formData.state}`,
         contactName: 'Customer',
        contactPhone: formData.phone,
      },
      vehicleType: formData.provider === 'kwik' ? 'bike' : 'auto',
      specialInstructions: formData.specialInstructions,
    };

    try {
      await bookDelivery.mutateAsync(bookingData);
      onOpenChange(false);
      // Reset form
      setFormData({
        street: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        specialInstructions: '',
        urgency: 'normal',
        provider: 'auto',
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const urgencyColors = {
    normal: 'bg-green-100 text-green-800',
    urgent: 'bg-yellow-100 text-yellow-800',
    emergency: 'bg-red-100 text-red-800',
  };

  const urgencyIcons = {
    normal: '🟢',
    urgent: '🟡',
    emergency: '🔴',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Book Courier
          </DialogTitle>
          <DialogDescription>
            Arrange delivery for order #{orderId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Order ID:</span>
                <span className="text-sm font-medium">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Value:</span>
                <span className="text-sm font-medium">₦{orderValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pickup Location:</span>
                <span className="text-sm font-medium">{pharmacyLocation.name}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Delivery Address</Label>
              <p className="text-sm text-muted-foreground">Where should we deliver the order?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="123 Main Street, Apartment 4B"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Lagos"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Lagos"
                  required
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="101241"
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08012345678"
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Options */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Delivery Options</Label>
              <p className="text-sm text-muted-foreground">Configure delivery preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value: 'normal' | 'urgent' | 'emergency') =>
                    setFormData({ ...formData, urgency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <span>{urgencyIcons.normal}</span>
                        <span>Normal (30-60 min)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <span>{urgencyIcons.urgent}</span>
                        <span>Urgent (15-30 min)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="emergency">
                      <div className="flex items-center gap-2">
                        <span>{urgencyIcons.emergency}</span>
                        <span>Emergency (5-15 min)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provider">Courier Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: 'kwik' | 'gokada' | 'auto') =>
                    setFormData({ ...formData, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-select (Best Price)</SelectItem>
                    <SelectItem value="kwik">Kwik</SelectItem>
                    <SelectItem value="gokada">Gokada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                placeholder="Any special delivery instructions..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Urgency Warning */}
          {formData.urgency === 'emergency' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Emergency Delivery</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Emergency deliveries have higher costs and are prioritized for urgent medical needs.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={bookDelivery.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bookDelivery.isPending}
              className="bg-ms-yellow hover:bg-ms-yellow/90"
            >
              {bookDelivery.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Book Courier
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
