'use client';

import { useState } from 'react';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useAddPerson } from '@/features/pharmacy-team/hooks';
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { PharmacyRoleType } from '@/features/onboarding/types';
import { ROLE_TYPE_DISPLAY } from '@/features/onboarding/types';

const ROLE_TYPE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_TYPE_DISPLAY).map(([key, value]) => [key, value.name])
);

interface AddPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPersonModal({ open, onOpenChange }: AddPersonModalProps) {
  const { pharmacyId } = usePharmacyContext();
  const addPersonMutation = useAddPerson();
  const { data: locations } = useLocations(pharmacyId ?? undefined);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roleType: '' as PharmacyRoleType | '',
    password: '',
    confirmPassword: '',
    forcePasswordReset: true,
    pcnNumber: '',
    licenseExpiryDate: '',
    locationId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isPharmacistRole =
    formData.roleType === 'SUPERINTENDENT_PHARMACIST' ||
    formData.roleType === 'SUPERVISING_PHARMACIST';

  const isLocationScoped = formData.roleType === 'SUPERVISING_PHARMACIST' || formData.roleType === 'STAFF';

  const isFormValid = () => {
    if (!formData.name || !formData.email || !formData.phone?.trim() || !formData.roleType || !formData.password || !formData.confirmPassword) {
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      return false;
    }
    if (formData.password.length < 8) {
      return false;
    }
    if (isPharmacistRole && !formData.pcnNumber) {
      return false;
    }
    // Location required for location-scoped roles
    if (isLocationScoped && !formData.locationId) {
      return false;
    }
    return true;
  };

  const getPasswordValidationErrors = () => {
    const errors: string[] = [];
    if (formData.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(formData.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(formData.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(formData.password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !pharmacyId) {
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    const passwordErrors = getPasswordValidationErrors();
    if (passwordErrors.length > 0) {
      return;
    }

    try {
      await addPersonMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim(),
        roleType: formData.roleType as PharmacyRoleType,
        password: formData.password,
        forcePasswordReset: formData.forcePasswordReset,
        pcnNumber: isPharmacistRole ? formData.pcnNumber : undefined,
        licenseExpiryDate: formData.licenseExpiryDate || undefined,
        locationIds: isLocationScoped && formData.locationId ? [formData.locationId] : undefined,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        roleType: '' as PharmacyRoleType | '',
        password: '',
        confirmPassword: '',
        forcePasswordReset: true,
        pcnNumber: '',
        licenseExpiryDate: '',
        locationId: '',
      });

      // Close modal on success (mutation's onSuccess will show toast)
      onOpenChange(false);
    } catch {
      // Error handled by mutation's onError callback
      // Don't close modal on error so user can fix and retry
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add Person to Pharmacy Team</DialogTitle>
          <DialogDescription>
            Add a new team member to your pharmacy. They can log in immediately with the password you set.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form id="add-person-form" onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.password && getPasswordValidationErrors().length > 0 && (
              <div className="text-xs text-destructive space-y-1 mt-1">
                {getPasswordValidationErrors().map((error, idx) => (
                  <div key={idx}>• {error}</div>
                ))}
              </div>
            )}
            {formData.password && getPasswordValidationErrors().length === 0 && (
              <p className="text-xs text-green-600 mt-1">✓ Password meets requirements</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length > 0 && (
              <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
            )}
          </div>

          {/* <div className="flex items-start space-x-3 py-2">
            <Checkbox
              id="forcePasswordReset"
              checked={formData.forcePasswordReset}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, forcePasswordReset: checked as boolean })
              }
            />
            <Label htmlFor="forcePasswordReset" className="text-sm leading-tight cursor-pointer">
              User must change password on first login
            </Label>
          </div> */}

          <div className="space-y-2">
            <Label htmlFor="roleType">Role *</Label>
            <Select
              value={formData.roleType}
              onValueChange={(value) => {
                const newRoleType = value as PharmacyRoleType;
                const newIsLocationScoped = newRoleType === 'SUPERVISING_PHARMACIST' || newRoleType === 'STAFF';
                // Clear locationId when switching to org-scoped role
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
                <p className="text-xs text-destructive mt-1">Location is required for {formData.roleType === 'SUPERVISING_PHARMACIST' ? 'Supervising Pharmacist' : 'Staff'} roles</p>
              )}
            </div>
          )}

          {isPharmacistRole && (
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
          <Button type="submit" form="add-person-form" disabled={!isFormValid() || addPersonMutation.isPending}>
            {addPersonMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Person
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
