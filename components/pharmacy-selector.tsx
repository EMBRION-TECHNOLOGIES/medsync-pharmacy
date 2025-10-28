'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Phone, Mail, Check } from 'lucide-react';
import { pharmacyService } from '@/features/pharmacy/service';
import { Pharmacy } from '@/lib/zod-schemas';

interface PharmacySelectorProps {
  onSelectPharmacy: (pharmacy: Pharmacy) => void;
  selectedPharmacy?: Pharmacy;
}

export function PharmacySelector({ onSelectPharmacy, selectedPharmacy }: PharmacySelectorProps) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      setIsLoading(true);
      const response = await pharmacyService.getPharmacies({
        limit: 50,
        search: searchTerm || undefined,
      });
      setPharmacies(response.pharmacies || []);
      setError(null);
    } catch (err) {
      setError('Failed to load pharmacies. Please try again.');
      console.error('Error loading pharmacies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm !== '') {
        loadPharmacies();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handlePharmacySelect = (pharmacy: Pharmacy) => {
    onSelectPharmacy(pharmacy);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search">Search Pharmacies</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="search"
            placeholder="Search by name, address, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 max-h-96 overflow-y-auto">
          {pharmacies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pharmacies found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            pharmacies.map((pharmacy) => (
              <Card
                key={pharmacy.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPharmacy?.id === pharmacy.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePharmacySelect(pharmacy)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{pharmacy.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {pharmacy.address}
                      </CardDescription>
                    </div>
                    {selectedPharmacy?.id === pharmacy.id && (
                      <Badge variant="default" className="bg-primary">
                        <Check className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {pharmacy.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {pharmacy.phone}
                      </div>
                    )}
                    {pharmacy.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {pharmacy.email}
                      </div>
                    )}
                    {pharmacy.description && (
                      <p className="text-xs mt-2">{pharmacy.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedPharmacy && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="h-5 w-5" />
            <p className="font-medium">Selected: {selectedPharmacy.name}</p>
          </div>
          <p className="text-sm text-green-700 mt-1">
            You will be registering as a staff member for this pharmacy
          </p>
        </div>
      )}
    </div>
  );
}
