'use client';

import { useLocations } from '@/features/pharmacy/hooks';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import { useOrg } from '@/store/useOrg';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Building2, Mail, AlertTriangle } from 'lucide-react';

export default function LocationsPage() {
  const { pharmacyId } = useOrg();
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useLocations(pharmacyId);
  const { data: pharmacy, isLoading: pharmacyLoading } = usePharmacyProfile();

  const isLoading = locationsLoading || pharmacyLoading;
  
  // ✅ FIX: Extract pharmacy data from nested structure
  const pharmacyData = pharmacy && typeof pharmacy === 'object' && 'pharmacy' in pharmacy
    ? (pharmacy as any).pharmacy
    : pharmacy && typeof pharmacy === 'object' && 'id' in pharmacy
    ? pharmacy
    : null;

  // ✅ FIX: Show main pharmacy address as the primary location
  const hasBranchLocations = locations && locations.length > 0;
  const mainPharmacyAddress = pharmacyData?.address;
  const mainPharmacyCity = pharmacyData?.city;
  const mainPharmacyPhone = pharmacyData?.phone;
  const mainPharmacyEmail = pharmacyData?.email;
  const mainPharmacyName = pharmacyData?.name || 'Main Pharmacy';

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground">
          Your pharmacy locations and branches
        </p>
      </div>

      {/* Locations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : locationsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-destructive">Failed to load locations</p>
            <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Main Pharmacy Location - Always show if address exists */}
          {mainPharmacyAddress && (
            <Card className="hover:shadow-md transition-shadow border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {mainPharmacyName}
                  <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/20">
                    Primary
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Main pharmacy location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    {mainPharmacyAddress}
                    {mainPharmacyCity && `, ${mainPharmacyCity}`}
                  </p>
                </div>
                {mainPharmacyPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground">{mainPharmacyPhone}</p>
                  </div>
                )}
                {mainPharmacyEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground">{mainPharmacyEmail}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Branch Locations */}
          {hasBranchLocations && locations.map((location) => (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {location.name || location.displayName || 'Branch Location'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">{location.address || 'No address provided'}</p>
                </div>
                {location.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground">{location.phone}</p>
                  </div>
                )}
                {location.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground">{location.email}</p>
                  </div>
                )}
                {location.city && (
                  <div className="text-xs text-muted-foreground">
                    {location.city}{location.state ? `, ${location.state}` : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State - Only show if no main address and no branches */}
      {!isLoading && !mainPharmacyAddress && !hasBranchLocations && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground font-medium mb-2">No location information available</p>
            <p className="text-sm text-muted-foreground">
              Please update your pharmacy profile with an address
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </RoleGuard>
  );
}
