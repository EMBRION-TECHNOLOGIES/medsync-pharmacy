'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreateLocation, useUpdateLocation } from '@/features/pharmacy/hooks';
import { toast } from 'sonner';
import { Location } from '@/lib/zod-schemas';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { CheckCircle, AlertCircle, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { PasswordStrength, isPasswordValid } from '@/components/ui/password-strength';

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const locationSchema = z.object({
  // Location fields
  name: z.string().min(1, 'Location name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingTime: z.string().min(1, 'Opening time is required').regex(timeRegex, 'Use HH:mm format (e.g. 08:00)'),
  closingTime: z.string().min(1, 'Closing time is required').regex(timeRegex, 'Use HH:mm format (e.g. 20:00)'),
  // Supervisor fields (required for new locations)
  supervisorFirstName: z.string().min(1, 'First name is required'),
  supervisorLastName: z.string().min(1, 'Last name is required'),
  supervisorEmail: z.string().email('Valid email is required'),
  supervisorPhone: z.string().min(1, 'Supervisor phone number is required'),
  supervisorPassword: z.string().min(8, 'Password must be at least 8 characters'),
  supervisorLicenseNumber: z.string().min(1, 'PCN License number is required'),
});

// Edit mode schema (supervisor not required)
const editLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingTime: z.string().min(1, 'Opening time is required').regex(timeRegex, 'Use HH:mm format (e.g. 08:00)'),
  closingTime: z.string().min(1, 'Closing time is required').regex(timeRegex, 'Use HH:mm format (e.g. 20:00)'),
});

type LocationInput = z.infer<typeof locationSchema>;
type EditLocationInput = z.infer<typeof editLocationSchema>;

interface LocationDialogProps {
  pharmacyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
  mode: 'create' | 'edit';
}

export function LocationDialog({ pharmacyId, open, onOpenChange, location, mode }: LocationDialogProps) {
  const createLocation = useCreateLocation(pharmacyId);
  const updateLocation = useUpdateLocation(pharmacyId);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationInput>({
    resolver: zodResolver(mode === 'create' ? locationSchema : editLocationSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      phone: '',
      latitude: undefined,
      longitude: undefined,
      openingTime: '08:00',
      closingTime: '20:00',
      supervisorFirstName: '',
      supervisorLastName: '',
      supervisorEmail: '',
      supervisorPhone: '',
      supervisorPassword: '',
      supervisorLicenseNumber: '',
    },
  });

  // Watch for coordinate changes to determine verification status
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const supervisorPassword = watch('supervisorPassword');

  useEffect(() => {
    setIsAddressVerified(!!(latitude && longitude));
  }, [latitude, longitude]);

  // Reset form when dialog opens/closes or location changes
  useEffect(() => {
    if (open) {
      setCreatedCredentials(null);
      if (location && mode === 'edit') {
        reset({
          name: location.name || '',
          address: location.address || '',
          city: location.city || '',
          phone: location.phone || '',
          latitude: location.latitude || undefined,
          longitude: location.longitude || undefined,
          openingTime: location.openingTime || '08:00',
          closingTime: location.closingTime || '20:00',
          supervisorFirstName: '',
          supervisorLastName: '',
          supervisorEmail: '',
          supervisorPhone: '',
          supervisorPassword: '',
          supervisorLicenseNumber: '',
        });
        if (location.latitude && location.longitude) {
          setIsAddressVerified(true);
        }
      } else {
        reset({
          name: '',
          address: '',
          city: '',
          phone: '',
          latitude: undefined,
          longitude: undefined,
          openingTime: '08:00',
          closingTime: '20:00',
          supervisorFirstName: '',
          supervisorLastName: '',
          supervisorEmail: '',
          supervisorPhone: '',
          supervisorPassword: '',
          supervisorLicenseNumber: '',
        });
        setIsAddressVerified(false);
      }
    }
  }, [location, mode, reset, open]);

  // Geolocation function
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    const isSecureContext = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      toast.error('Geolocation requires a secure connection (HTTPS)');
      return;
    }

    setIsGeocoding(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          setValue('latitude', latitude);
          setValue('longitude', longitude);

          try {
            const res = await fetch(
              `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`
            );
            const json = await res.json();
            const data = json.success ? json.data : null;

            if (data?.display_name) {
              const addressParts = data.display_name.split(',');
              const shortAddress = addressParts.slice(0, 3).join(', ').trim();
              setValue('address', shortAddress);

              if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.state;
                if (city) {
                  setValue('city', city);
                }
              }
            } else {
              setValue('address', `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch (reverseGeoError) {
            console.error('Reverse geocoding error:', reverseGeoError);
            setValue('address', `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }

          setIsGeocoding(false);
          setIsAddressVerified(true);
          toast.success('Location detected successfully');
        } catch (error) {
          setIsGeocoding(false);
          console.error('Error processing location:', error);
          toast.error('Failed to process location');
        }
      },
      (error) => {
        setIsGeocoding(false);
        let errorMessage = 'Could not detect your location. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Please enter address manually.';
        }

        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const onSubmit = async (data: LocationInput) => {
    // Validate coordinates
    if (!data.latitude || !data.longitude) {
      toast.error('Please verify the address to get coordinates before saving');
      return;
    }

    // For create mode, validate password strength
    if (mode === 'create' && !isPasswordValid(data.supervisorPassword)) {
      toast.error('Supervisor password does not meet security requirements');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const result = await createLocation.mutateAsync({
          name: data.name,
          address: data.address,
          city: data.city || undefined,
          phone: data.phone || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          openingTime: data.openingTime || '08:00',
          closingTime: data.closingTime || '20:00',
          supervisor: {
            firstName: data.supervisorFirstName,
            lastName: data.supervisorLastName,
            email: data.supervisorEmail,
            phone: data.supervisorPhone || undefined,
            password: data.supervisorPassword,
            licenseNumber: data.supervisorLicenseNumber,
          },
        });

        // Show credentials if returned
        if (result.credentials) {
          setCreatedCredentials(result.credentials);
          toast.success('Location and Supervising Pharmacist created successfully!');
        } else {
          toast.success('Location created successfully');
          onOpenChange(false);
          reset();
          setIsAddressVerified(false);
        }
      } else if (location) {
        await updateLocation.mutateAsync({
          locationId: location.id,
          data: {
            name: data.name,
            address: data.address,
            city: data.city || undefined,
            phone: data.phone || undefined,
            latitude: data.latitude,
            longitude: data.longitude,
            openingTime: data.openingTime || '08:00',
            closingTime: data.closingTime || '20:00',
          },
        });
        toast.success('Location updated successfully');
        onOpenChange(false);
        reset();
        setIsAddressVerified(false);
      }
    } catch (error: any) {
      console.error('Failed to save location:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to save location';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedCredentials(null);
    onOpenChange(false);
    reset();
    setIsAddressVerified(false);
  };

  // If credentials were created, show the credentials screen
  if (createdCredentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Location Created Successfully
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the Supervising Pharmacist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
              <h4 className="font-medium text-green-800">Supervising Pharmacist Credentials</h4>
              
              <div className="space-y-2">
                <Label className="text-sm text-green-700">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdCredentials.email}
                    readOnly
                    className="bg-white font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                  >
                    {copiedField === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-green-700">Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdCredentials.password}
                    readOnly
                    type={showPassword ? 'text' : 'password'}
                    className="bg-white font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                  >
                    {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Please securely share these credentials with the Supervising Pharmacist. 
              They should change their password after first login.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose} className="ms-gradient">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Location' : 'Edit Location'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new branch location with its Supervising Pharmacist'
              : 'Update location details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Details Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Location Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Ikeja Branch, Victoria Island Branch"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <AddressAutocomplete
                value={watch('address') || ''}
                onChange={(value) => {
                  setValue('address', value);
                  if (!value) {
                    setValue('latitude', undefined);
                    setValue('longitude', undefined);
                    setIsAddressVerified(false);
                  }
                }}
                onAddressSelect={(address) => {
                  setValue('address', address.formattedAddress);
                  setValue('latitude', address.latitude);
                  setValue('longitude', address.longitude);
                  if (address.city) {
                    setValue('city', address.city);
                  }
                  setIsAddressVerified(true);
                  toast.success('✓ Address verified with coordinates');
                }}
                placeholder="Type to search address..."
                disabled={isSubmitting}
                onGeolocation={getCurrentLocation}
                showGeolocationButton={true}
                isGeolocating={isGeocoding}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
              
              {isAddressVerified ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Address verified ({latitude?.toFixed(4)}, {longitude?.toFixed(4)})</span>
                </div>
              ) : watch('address') ? (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Select an address from suggestions to verify</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Auto-filled"
                  {...register('city')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  {...register('phone')}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openingTime">Opening Time *</Label>
                <Input
                  id="openingTime"
                  type="time"
                  {...register('openingTime')}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">e.g. 08:00 (8 AM)</p>
                {errors.openingTime && (
                  <p className="text-sm text-destructive">{errors.openingTime.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingTime">Closing Time *</Label>
                <Input
                  id="closingTime"
                  type="time"
                  {...register('closingTime')}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">e.g. 20:00 (8 PM)</p>
                {errors.closingTime && (
                  <p className="text-sm text-destructive">{errors.closingTime.message}</p>
                )}
              </div>
            </div>

            {/* Hidden coordinate fields */}
            <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
            <input type="hidden" {...register('longitude', { valueAsNumber: true })} />
          </div>

          {/* Supervisor Section - Only for Create Mode */}
          {mode === 'create' && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Supervising Pharmacist
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Each location requires a Supervising Pharmacist. This will create a new user account.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supervisorFirstName">First Name *</Label>
                    <Input
                      id="supervisorFirstName"
                      placeholder="First name"
                      {...register('supervisorFirstName')}
                      disabled={isSubmitting}
                    />
                    {errors.supervisorFirstName && (
                      <p className="text-sm text-destructive">{errors.supervisorFirstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorLastName">Last Name *</Label>
                    <Input
                      id="supervisorLastName"
                      placeholder="Last name"
                      {...register('supervisorLastName')}
                      disabled={isSubmitting}
                    />
                    {errors.supervisorLastName && (
                      <p className="text-sm text-destructive">{errors.supervisorLastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisorEmail">Email *</Label>
                  <Input
                    id="supervisorEmail"
                    type="email"
                    placeholder="supervisor@example.com"
                    {...register('supervisorEmail')}
                    disabled={isSubmitting}
                  />
                  {errors.supervisorEmail && (
                    <p className="text-sm text-destructive">{errors.supervisorEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisorPhone">Phone Number *</Label>
                  <Input
                    id="supervisorPhone"
                    type="tel"
                    placeholder="08012345678"
                    {...register('supervisorPhone')}
                    disabled={isSubmitting}
                  />
                  {errors.supervisorPhone && (
                    <p className="text-sm text-destructive">{errors.supervisorPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisorLicenseNumber">PCN License Number *</Label>
                  <Input
                    id="supervisorLicenseNumber"
                    placeholder="PH123456789"
                    {...register('supervisorLicenseNumber')}
                    disabled={isSubmitting}
                  />
                  {errors.supervisorLicenseNumber && (
                    <p className="text-sm text-destructive">{errors.supervisorLicenseNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisorPassword">Password *</Label>
                  <div className="relative">
                    <Input
                      id="supervisorPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      {...register('supervisorPassword')}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.supervisorPassword && (
                    <p className="text-sm text-destructive">{errors.supervisorPassword.message}</p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                {supervisorPassword && (
                  <PasswordStrength password={supervisorPassword} />
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isAddressVerified}
              className="ms-gradient"
            >
              {isSubmitting 
                ? 'Creating...' 
                : mode === 'create' 
                  ? 'Create Location & Supervisor' 
                  : 'Save Changes'}
            </Button>
          </div>
          
          {!isAddressVerified && (
            <p className="text-xs text-center text-muted-foreground">
              Address must be verified before saving
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
