'use client';

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

export function OrgSwitcher() {
  const { pharmacyId, locationId, setLocation } = useOrg();
  const { data: pharmacy } = usePharmacy(pharmacyId);
  const { data: locations } = useLocations(pharmacyId);

  const currentLocation = locations?.find((l) => l.id === locationId);

  return (
    <div className="flex items-center gap-x-3">
      {/* Pharmacy Name */}
      <div className="flex items-center gap-x-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{pharmacy?.name || 'Loading...'}</span>
      </div>

      {/* Location Switcher */}
      {locations && locations.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-x-2">
                <MapPin className="h-4 w-4" />
                <span>{currentLocation?.name || 'All Locations'}</span>
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
              {locations.map((location) => (
                <DropdownMenuItem
                  key={location.id}
                  onClick={() => setLocation(location.id, location.name)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {location.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

