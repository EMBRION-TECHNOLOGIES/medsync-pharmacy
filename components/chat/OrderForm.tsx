'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ordersService } from '@/features/orders/service';

interface OrderFormProps {
  roomId: string;
  onOrderCreated?: (orderId: string) => void;
}

interface DrugItem {
  id: string;
  drugName: string;
  quantity: string;
  dosageSig: string;
  priceNgn: string;
  isExpanded: boolean;
}

export function OrderForm({ roomId, onOrderCreated }: OrderFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drugs, setDrugs] = useState<DrugItem[]>([
    {
      id: '1',
      drugName: '',
      quantity: '',
      dosageSig: '',
      priceNgn: '',
      isExpanded: true
    }
  ]);

  const addDrug = () => {
    const newId = (drugs.length + 1).toString();
    setDrugs([...drugs, {
      id: newId,
      drugName: '',
      quantity: '',
      dosageSig: '',
      priceNgn: '',
      isExpanded: true
    }]);
  };

  const toggleDrugExpansion = (id: string) => {
    setDrugs(drugs.map(drug => 
      drug.id === id ? { ...drug, isExpanded: !drug.isExpanded } : drug
    ));
  };

  const removeDrug = (id: string) => {
    if (drugs.length > 1) {
      setDrugs(drugs.filter(drug => drug.id !== id));
    }
  };

  const updateDrug = (id: string, field: keyof DrugItem, value: string) => {
    setDrugs(drugs.map(drug => 
      drug.id === id ? { ...drug, [field]: value } : drug
    ));
  };

  const totalMedicationPrice = drugs.reduce((total, drug) => {
    const price = parseFloat(drug.priceNgn) || 0;
    return total + price;
  }, 0);

  // SIMPLE TEST FUNCTION - Bypass all validation
  const testOrderCreation = async () => {
    try {
      console.log('=== TESTING WITH HARDCODED DATA ===');
      const testData = {
        drugName: "Paracetamol 500mg",
        quantity: 20,
        dosageSig: "2 tablets every 6 hours",
        priceNgn: 2000
      };
      
      console.log('Test data:', JSON.stringify(testData, null, 2));
      console.log('Data types:', {
        drugName: typeof testData.drugName,
        quantity: typeof testData.quantity,
        dosageSig: typeof testData.dosageSig,
        priceNgn: typeof testData.priceNgn
      });
      
      const order = await ordersService.createOrder(roomId, testData);
      console.log('SUCCESS! Order created:', order);
      toast.success('Test order created successfully!');
    } catch (error: any) {
      console.error('TEST FAILED:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Test failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate roomId
    if (!roomId || roomId === 'undefined' || roomId === 'null') {
      toast.error('No chat room selected. Please select a conversation first.');
      return;
    }
    
    console.log('RoomId validation passed:', roomId);
    
    // Validate all drugs and clean data
    const validDrugs = drugs.filter(drug => 
      drug.drugName.trim() && drug.quantity && drug.priceNgn && drug.dosageSig.trim()
    ).map(drug => ({
      ...drug,
      drugName: drug.drugName.trim(), // Remove extra spaces
      dosageSig: drug.dosageSig.trim() // Clean dosage
    }));
    
    if (validDrugs.length === 0) {
      toast.error('Please add at least one drug with name, quantity, dosage, and price');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare order data - support both single and multi-drug formats
      const orderData = validDrugs.length === 1 
        ? {
            drugName: validDrugs[0].drugName,
            quantity: parseInt(validDrugs[0].quantity, 10),
            dosageSig: validDrugs[0].dosageSig,
            priceNgn: parseFloat(validDrugs[0].priceNgn)
          }
        : {
            items: validDrugs.map(drug => ({
              drugName: drug.drugName,
              quantity: parseInt(drug.quantity, 10),
              dosageSig: drug.dosageSig,
              priceNgn: parseFloat(drug.priceNgn)
            }))
          };
      
      // Validate parsed values
      const hasInvalidValues = validDrugs.length === 1 
        ? (isNaN(orderData.quantity || 0) || isNaN(orderData.priceNgn || 0))
        : orderData.items?.some(item => isNaN(item.quantity || 0) || isNaN(item.priceNgn || 0)) || false;
      
      if (hasInvalidValues) {
        toast.error('Invalid quantity or price values. Please check your input.');
        return;
      }
      
      // Debug: Check data types and values
      console.log('Raw validDrugs:', validDrugs);
      console.log('Parsed orderData:', orderData);
      console.log('Data type checks:', {
        drugName: typeof orderData.drugName || typeof orderData.items?.[0]?.drugName,
        quantity: typeof (orderData.quantity || orderData.items?.[0]?.quantity),
        dosageSig: typeof (orderData.dosageSig || orderData.items?.[0]?.dosageSig),
        priceNgn: typeof (orderData.priceNgn || orderData.items?.[0]?.priceNgn)
      });
      
      // Ensure all numeric values are actually numbers
      if (validDrugs.length === 1) {
        orderData.quantity = Number(orderData.quantity);
        orderData.priceNgn = Number(orderData.priceNgn);
      } else if (orderData.items) {
        orderData.items = orderData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          priceNgn: Number(item.priceNgn)
        }));
      }
      
      console.log('Final orderData after Number() conversion:', orderData);
      
      // BULLETPROOF DEBUG - Let's see EXACTLY what's being sent
      console.log('=== ORDER CREATION DEBUG ===');
      console.log('1. RoomId:', roomId, typeof roomId);
      console.log('2. Valid drugs count:', validDrugs.length);
      console.log('3. Raw validDrugs:', JSON.stringify(validDrugs, null, 2));
      console.log('4. Final orderData:', JSON.stringify(orderData, null, 2));
      console.log('5. Data types:', {
        drugName: typeof orderData.drugName || typeof orderData.items?.[0]?.drugName,
        quantity: typeof (orderData.quantity || orderData.items?.[0]?.quantity),
        dosageSig: typeof (orderData.dosageSig || orderData.items?.[0]?.dosageSig),
        priceNgn: typeof (orderData.priceNgn || orderData.items?.[0]?.priceNgn)
      });
      
      // Let's also test the exact API call manually
      console.log('6. About to call API with:', {
        url: `/chat-orders/${roomId}/order`,
        method: 'POST',
        data: orderData
      });
      
      const order = await ordersService.createOrder(roomId, orderData);
      
      const drugCount = validDrugs.length;
      const drugText = drugCount === 1 ? 'drug' : 'drugs';
      toast.success(`Order created successfully! ${drugCount} ${drugText} added. Total medication price: ₦${totalMedicationPrice.toLocaleString()}`);
      setOpen(false);
      setDrugs([{
        id: '1',
        drugName: '',
        quantity: '',
        dosageSig: '',
        priceNgn: '',
        isExpanded: true
      }]);
      
      if (onOrderCreated) {
        console.log('🎉 Calling onOrderCreated callback with order ID:', order.id);
        onOrderCreated(order.id);
      } else {
        console.log('❌ No onOrderCreated callback provided');
      }
      
    } catch (error: any) {
      console.error('Order creation failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request headers:', error.config?.headers);
      console.error('Request data:', error.config?.data);
      
      // Better error messages based on status code
      let errorMessage = 'Failed to create order';
      if (error.response?.status === 400) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'MISSING_IDEMPOTENCY_KEY') {
          errorMessage = 'Missing Idempotency-Key header. Please refresh and try again.';
        } else if (errorCode === 'INVALID_PAYLOAD') {
          errorMessage = 'Invalid order data. Please check all fields are filled correctly.';
        } else if (errorCode === 'NOT_PARTICIPANT') {
          errorMessage = 'You are not a participant in this chat room.';
        } else {
          errorMessage = 'Invalid order data. Please check all fields are filled correctly.';
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create orders in this chat room.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Chat room not found. Please refresh and try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Duplicate order detected. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Order
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drug Items */}
            {drugs.map((drug, index) => (
              <div key={drug.id} className="border rounded-lg">
                {/* Drug Header - Always Visible */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDrugExpansion(drug.id)}
                      className="p-1 h-6 w-6"
                    >
                      {drug.isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <h4 className="font-medium">
                      Drug {index + 1}
                      {drug.drugName && (
                        <span className="text-muted-foreground ml-2">
                          - {drug.drugName}
                        </span>
                      )}
                    </h4>
                  </div>
                  {drugs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDrug(drug.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Drug Content - Collapsible */}
                {drug.isExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`drugName-${drug.id}`}>Drug Name *</Label>
                        <Input
                          id={`drugName-${drug.id}`}
                          placeholder="e.g., Paracetamol 500mg"
                          value={drug.drugName}
                          onChange={(e) => updateDrug(drug.id, 'drugName', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${drug.id}`}>Quantity *</Label>
                        <Input
                          id={`quantity-${drug.id}`}
                          type="number"
                          placeholder="e.g., 20"
                          value={drug.quantity}
                          onChange={(e) => updateDrug(drug.id, 'quantity', e.target.value)}
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`dosageSig-${drug.id}`}>Dosage Instructions *</Label>
                      <Textarea
                        id={`dosageSig-${drug.id}`}
                        placeholder="e.g., 2 tablets every 6 hours"
                        value={drug.dosageSig}
                        onChange={(e) => updateDrug(drug.id, 'dosageSig', e.target.value)}
                        rows={2}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`priceNgn-${drug.id}`}>Medication Price (₦) *</Label>
                      <Input
                        id={`priceNgn-${drug.id}`}
                        type="number"
                        placeholder="e.g., 2000"
                        value={drug.priceNgn}
                        onChange={(e) => updateDrug(drug.id, 'priceNgn', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter only the medication cost for this drug. Delivery and service fees will be calculated automatically by the system.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Another Drug Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addDrug}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Drug
            </Button>
          </form>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t p-4 bg-background">
          {/* Total Medication Price */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Medication Price:</span>
              <span className="text-lg font-bold">₦{totalMedicationPrice.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Patient will see additional delivery & processing fees when they view the order in their mobile app.
            </p>
          </div>

          <div className="flex justify-between gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={testOrderCreation}
              disabled={loading}
              className="text-xs"
            >
              🧪 Test API
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
