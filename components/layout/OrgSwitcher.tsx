'use client';

import { useEffect } from 'react';
import { Building2, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrg } from '@/store/useOrg';
import { usePharmacy, useLocations } from '@/features/pharmacy/hooks';
import { usePharmacyContext } from '@/store/usePharmacyContext';

export function OrgSwitcher() {
  const { pharmacyId, locationId, setLocation } = useOrg();
  const { data: pharmacy } = usePharmacy(pharmacyId);
  const { data: locations } = useLocations(pharmacyId);
  const { roleType } = usePharmacyContext();

  const currentLocation = locations?.find((l) => l.id === locationId);
  const isLocationScoped = roleType === 'STAFF' || roleType === 'SUPERVISING_PHARMACIST';

  // For location-scoped users, force a concrete location selection (no org-wide actions)
  useEffect(() => {
    if (!isLocationScoped) return;
    if (!locations || locations.length === 0) return;
    if (locationId && locationId.length > 0) return;
    setLocation(locations[0].id, locations[0].name);
  }, [isLocationScoped, locations, locationId, setLocation]);

  return (
    <div className="flex items-center gap-x-3">
      {/* Pharmacy Name */}
      <div className="flex items-center gap-x-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{pharmacy?.name || 'Loading...'}</span>
      </div>

      {/* Location Switcher - Only show for org-scoped roles (Owner, Superintendent) */}
      {locations && locations.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          {isLocationScoped ? (
            /* Location-scoped users (Supervisor, Staff) - show fixed location, no dropdown */
            <div className="flex items-center gap-x-2 text-sm px-3 py-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {currentLocation?.name || 'Your Location'}
              </span>
            </div>
          ) : (
            /* Org-scoped users (Owner, Superintendent) - show dropdown to switch */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {currentLocation?.name || 'All Locations'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Select Location</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('', 'All Locations')}>
                  <MapPin className="mr-2 h-4 w-4" />
                  All Locations
                </DropdownMenuItem>
                {locations.map((location) => {
                  const displayName = location.name || 'Unnamed Location';
                  return (
                    <DropdownMenuItem
                      key={location.id}
                      onClick={() => setLocation(location.id, displayName)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {displayName}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );
}

