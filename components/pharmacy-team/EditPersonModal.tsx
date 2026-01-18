'use client';

import { useState, useEffect } from 'react';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useUpdatePerson } from '@/features/pharmacy-team/hooks';
import { useLocations } from '@/features/pharmacy/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { PharmacyRoleType } from '@/features/onboarding/types';
import { ROLE_TYPE_DISPLAY } from '@/features/onboarding/types';
import type { TeamMember } from '@/features/pharmacy-team/service';

const ROLE_TYPE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_TYPE_DISPLAY).map(([key, value]) => [key, value.name])
);

interface EditPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

export function EditPersonModal({ open, onOpenChange, member }: EditPersonModalProps) {
  const { pharmacyId } = usePharmacyContext();
  const updatePersonMutation = useUpdatePerson();
  const { data: locations } = useLocations(pharmacyId);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    roleType: '' as PharmacyRoleType | '',
    pcnNumber: '',
    licenseExpiryDate: '',
    locationId: '',
  });

  // Initialize form data when member changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        phone: member.phone || '',
        roleType: member.roleType || '',
        pcnNumber: '', // PCN number is not returned from API, user must re-enter if changing to pharmacist role
        licenseExpiryDate: '',
        locationId: member.locationId || '',
      });
    }
  }, [member]);

  const isPharmacistRole =
    formData.roleType === 'SUPERINTENDENT_PHARMACIST' ||
    formData.roleType === 'SUPERVISING_PHARMACIST';

  const isLocationScoped = formData.roleType === 'SUPERVISING_PHARMACIST' || formData.roleType === 'STAFF';

  const isOwner = member?.roleType === 'PHARMACY_OWNER';

  // Check if role is being changed to a pharmacist role
  const isChangingToPharmacistRole =
    isPharmacistRole && member?.roleType !== formData.roleType;

  const isFormValid = () => {
    if (!formData.name) {
      return false;
    }
    // PCN required when changing to pharmacist role
    if (isChangingToPharmacistRole && !formData.pcnNumber) {
      return false;
    }
    // Location required for location-scoped roles
    if (isLocationScoped && !formData.locationId) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !pharmacyId || !member) {
      return;
    }

    try {
      await updatePersonMutation.mutateAsync({
        personId: member.id,
        data: {
          name: formData.name !== member.name ? formData.name : undefined,
          phone: formData.phone !== (member.phone || '') ? formData.phone || undefined : undefined,
          roleType: formData.roleType !== member.roleType ? (formData.roleType as PharmacyRoleType) : undefined,
          locationId: formData.locationId !== (member.locationId || '') ? (formData.locationId || null) : undefined,
          pcnNumber: isChangingToPharmacistRole ? formData.pcnNumber : undefined,
          licenseExpiryDate: formData.licenseExpiryDate || undefined,
        },
      });

      // Close modal on success
      onOpenChange(false);
    } catch {
      // Error handled by mutation's onError callback
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update information for {member.name}. Email cannot be changed as it is tied to their login.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form id="edit-person-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={member.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed as it is tied to the user's login
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number (optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleType">Role {!isOwner && '*'}</Label>
              {isOwner ? (
                <>
                  <Input
                    id="roleType"
                    value={ROLE_TYPE_DISPLAY_NAMES.PHARMACY_OWNER}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pharmacy owner role cannot be changed
                  </p>
                </>
              ) : (
                <Select
                  value={formData.roleType}
                  onValueChange={(value) => {
                    const newRoleType = value as PharmacyRoleType;
                    const newIsLocationScoped = newRoleType === 'SUPERVISING_PHARMACIST' || newRoleType === 'STAFF';
                    setFormData({
                      ...formData,
                      roleType: newRoleType,
                      locationId: newIsLocationScoped ? formData.locationId : '',
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERINTENDENT_PHARMACIST">
                      {ROLE_TYPE_DISPLAY_NAMES.SUPERINTENDENT_PHARMACIST}
                    </SelectItem>
                    <SelectItem value="SUPERVISING_PHARMACIST">
                      {ROLE_TYPE_DISPLAY_NAMES.SUPERVISING_PHARMACIST}
                    </SelectItem>
                    <SelectItem value="STAFF">
                      {ROLE_TYPE_DISPLAY_NAMES.STAFF}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLocationScoped && (
              <div className="space-y-2">
                <Label htmlFor="locationId">Location *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations && locations.length > 0 ? (
                      locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name || 'Unnamed Location'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No locations available. Create a location first.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isLocationScoped && !formData.locationId && (
                  <p className="text-xs text-destructive mt-1">
                    Location is required for {formData.roleType === 'SUPERVISING_PHARMACIST' ? 'Supervising Pharmacist' : 'Staff'} roles
                  </p>
                )}
              </div>
            )}

            {isChangingToPharmacistRole && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pcnNumber">PCN License Number *</Label>
                  <Input
                    id="pcnNumber"
                    placeholder="Enter PCN license number"
                    value={formData.pcnNumber}
                    onChange={(e) => setFormData({ ...formData, pcnNumber: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required when changing to a pharmacist role
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
                  <Input
                    id="licenseExpiryDate"
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseExpiryDate: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </form>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-person-form" disabled={!isFormValid() || updatePersonMutation.isPending}>
            {updatePersonMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
