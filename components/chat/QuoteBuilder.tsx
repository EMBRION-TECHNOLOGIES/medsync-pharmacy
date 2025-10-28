'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Search, Package, Clock, CirclePoundSterling, Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteItem {
  id: string;
  drugName: string;
  strength: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availability: 'in-stock' | 'low-stock' | 'out-of-stock';
  preparationTime: number; // minutes
}

interface QuoteBuilderProps {
  patientAlias: string;
  onSendQuote: (quote: QuoteItem[], totalAmount: number, deliveryEstimate: string) => void;
  onCancel: () => void;
}

export function QuoteBuilder({ patientAlias, onSendQuote, onCancel }: QuoteBuilderProps) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Mock inventory search
  const mockInventory = [
    { id: '1', name: 'Paracetamol', strength: '500mg', price: 150, stock: 'in-stock', prepTime: 5 },
    { id: '2', name: 'Amoxicillin', strength: '250mg', price: 800, stock: 'in-stock', prepTime: 10 },
    { id: '3', name: 'Omeprazole', strength: '20mg', price: 450, stock: 'low-stock', prepTime: 5 },
    { id: '4', name: 'Metformin', strength: '500mg', price: 300, stock: 'in-stock', prepTime: 5 },
    { id: '5', name: 'Losartan', strength: '50mg', price: 600, stock: 'out-of-stock', prepTime: 15 },
  ];

  const filteredInventory = mockInventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.strength.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = (inventoryItem: typeof mockInventory[0]) => {
    const existingItem = items.find(item => item.id === inventoryItem.id);
    
    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: QuoteItem = {
        id: inventoryItem.id,
        drugName: inventoryItem.name,
        strength: inventoryItem.strength,
        quantity: 1,
        unitPrice: inventoryItem.price,
        totalPrice: inventoryItem.price,
        availability: inventoryItem.stock as QuoteItem['availability'],
        preparationTime: inventoryItem.prepTime,
      };
      setItems([...items, newItem]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
        : item
    ));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const maxPrepTime = items.length > 0 ? Math.max(...items.map(item => item.preparationTime)) : 0;
  const deliveryEstimate = maxPrepTime > 0 ? `${maxPrepTime + 30}-${maxPrepTime + 60} minutes` : '30-60 minutes';

  const handleSendQuote = () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to the quote');
      return;
    }
    
    onSendQuote(items, totalAmount, deliveryEstimate);
  };

  const getStockBadgeColor = (availability: QuoteItem['availability']) => {
    switch (availability) {
      case 'in-stock': return 'bg-ms-green text-white';
      case 'low-stock': return 'bg-ms-yellow text-black';
      case 'out-of-stock': return 'bg-red-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Quote Builder
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Creating quote for {patientAlias}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search Inventory */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Inventory</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by drug name or strength..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-2">
            <Label>Available Items</Label>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => addItem(item)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.strength}
                      </Badge>
                      <Badge className={`text-xs ${getStockBadgeColor(item.stock as QuoteItem['availability'])}`}>
                        {item.stock.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>₦{item.price}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.prepTime}min
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote Items */}
        {items.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <Label>Quote Items</Label>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.drugName}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.strength}
                      </Badge>
                      <Badge className={`text-xs ${getStockBadgeColor(item.availability)}`}>
                        {item.availability.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>₦{item.unitPrice} each</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.preparationTime}min prep
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-medium w-20 text-right">
                      ₦{item.totalPrice.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote Summary */}
        {items.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold flex items-center gap-1">
                  <CirclePoundSterling className="h-5 w-5" />
                  ₦{totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Delivery Estimate:</span>
                <span>{deliveryEstimate}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Preparation Time:</span>
                <span>{maxPrepTime} minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendQuote}
            disabled={items.length === 0}
            className="bg-ms-green hover:bg-ms-green/90"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
