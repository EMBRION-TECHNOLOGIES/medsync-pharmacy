'use client';

import { useState } from 'react';
import { useLocations, useDeleteLocation } from '@/features/pharmacy/hooks';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import { useOrg } from '@/store/useOrg';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Building2, Mail, AlertTriangle, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LocationDialog } from '@/components/locations/LocationDialog';
import { Location } from '@/lib/zod-schemas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function LocationsPage() {
  const { pharmacyId } = useOrg();
  const queryClient = useQueryClient();
  const { data: locations, isLoading: locationsLoading, error: locationsError, refetch: refetchLocations } = useLocations(pharmacyId);
  const { data: pharmacy, isLoading: pharmacyLoading, refetch: refetchPharmacy } = usePharmacyProfile();
  const deleteLocation = useDeleteLocation(pharmacyId || '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  const isLoading = locationsLoading || pharmacyLoading;
  
  // ✅ FIX: Extract pharmacy data from nested structure
  const pharmacyData = pharmacy && typeof pharmacy === 'object' && 'pharmacy' in pharmacy
    ? (pharmacy as { pharmacy: { id?: string; name?: string; address?: string; city?: string; phone?: string; email?: string; displayName?: string } }).pharmacy
    : pharmacy && typeof pharmacy === 'object' && 'id' in pharmacy
    ? pharmacy as { id?: string; name?: string; address?: string; city?: string; phone?: string; email?: string; displayName?: string }
    : null;

  // ✅ FIX: Show main pharmacy address as the primary location
  const hasBranchLocations = locations && locations.length > 0;
  const mainPharmacyAddress = pharmacyData?.address;
  const mainPharmacyCity = pharmacyData?.city;
  const mainPharmacyPhone = pharmacyData?.phone;
  const mainPharmacyEmail = pharmacyData?.email;
  const mainPharmacyName = pharmacyData?.name || pharmacyData?.displayName || 'Main Pharmacy';

  const handleRefresh = async () => {
    // Invalidate and refetch all pharmacy-related queries
    await queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    await Promise.all([refetchPharmacy(), refetchLocations()]);
  };

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;
    
    try {
      await deleteLocation.mutateAsync(locationToDelete.id);
      toast.success('Location deleted successfully');
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to delete location';
      toast.error(errorMessage);
    }
  };

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Your pharmacy locations and branches
          </p>
        </div>
        <div className="flex gap-2">
          {pharmacyId && (
            <Button
              onClick={handleCreateLocation}
              className="ms-gradient"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Locations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : locationsError ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-sm sm:text-base text-destructive">Failed to load locations</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Please try again later</p>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Main Pharmacy Location - Always show if address exists */}
          {mainPharmacyAddress && (
            <Card className="hover:shadow-md transition-shadow border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <span className="break-all flex-1 min-w-0">{mainPharmacyName}</span>
                  <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">
                    Primary
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Main pharmacy location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 pt-0">
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-muted-foreground break-all">
                    {mainPharmacyAddress}
                    {mainPharmacyCity && `, ${mainPharmacyCity}`}
                  </p>
                </div>
                {mainPharmacyPhone && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <p className="text-muted-foreground break-all">{mainPharmacyPhone}</p>
                  </div>
                )}
                {mainPharmacyEmail && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <p className="text-muted-foreground break-all">{mainPharmacyEmail}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Branch Locations */}
          {hasBranchLocations && locations.map((location) => (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <span className="break-all flex-1 min-w-0">
                    {location.name || 'Branch Location'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 pt-0">
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-muted-foreground break-all">
                    {location.address || 'No address provided'}
                    {location.city && `, ${location.city}`}
                  </p>
                </div>
                {location.phone && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <p className="text-muted-foreground break-all">{location.phone}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditLocation(location)}
                    className="flex-1"
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(location)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State - Only show if no main address and no branches */}
      {!isLoading && !mainPharmacyAddress && !hasBranchLocations && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <MapPin className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm sm:text-base text-muted-foreground font-medium mb-2">No locations yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Create your first location to start receiving orders
            </p>
            {pharmacyId && (
              <Button onClick={handleCreateLocation} className="ms-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Dialog */}
      {pharmacyId && (
        <LocationDialog
          pharmacyId={pharmacyId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          location={editingLocation}
          mode={editingLocation ? 'edit' : 'create'}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.name || 'this location'}"? 
              This action cannot be undone. Orders assigned to this location will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </RoleGuard>
  );
}
