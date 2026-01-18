'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useLocations } from '@/features/pharmacy/hooks';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleType: z.enum(['SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST', 'STAFF']),
  locationIds: z.array(z.string()).optional(),
  licenseNumber: z.string().optional(),
}).refine((data) => {
  // License number required for pharmacist roles
  if ((data.roleType === 'SUPERINTENDENT_PHARMACIST' || data.roleType === 'SUPERVISING_PHARMACIST') && !data.licenseNumber) {
    return false;
  }
  return true;
}, {
  message: 'License number is required for pharmacist roles',
  path: ['licenseNumber'],
}).refine((data) => {
  // Location required for location-scoped roles
  if ((data.roleType === 'SUPERVISING_PHARMACIST' || data.roleType === 'STAFF') && (!data.locationIds || data.locationIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Location is required for location-scoped roles',
  path: ['locationIds'],
});

type CreateUserInput = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  pharmacyId: string;
  onSuccess?: () => void;
}

export function CreateUserDialog({ pharmacyId, onSuccess }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const { data: locations } = useLocations(pharmacyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't render if no pharmacy ID
  if (!pharmacyId) {
    return null;
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      roleType: 'STAFF',
      locationIds: [],
    },
  });

  const selectedRole = watch('roleType');
  const selectedLocationIds = watch('locationIds') || [];

  const isLocationScoped = selectedRole === 'SUPERVISING_PHARMACIST' || selectedRole === 'STAFF';
  const isPharmacistRole = selectedRole === 'SUPERINTENDENT_PHARMACIST' || selectedRole === 'SUPERVISING_PHARMACIST';

  const onSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);
    try {
      const response = await api.post(`/pharmacy-management/pharmacies/${pharmacyId}/users`, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        roleType: data.roleType,
        locationIds: data.locationIds,
        licenseNumber: data.licenseNumber,
      });

      const credentials = response.data.data?.credentials;
      if (credentials) {
        setCreatedCredentials(credentials);
        toast.success('User created successfully! Login credentials are active.');
      } else {
        toast.success('User created successfully!');
        setOpen(false);
        reset();
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to create user:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedCredentials(null);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ms-gradient">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account. They can log in immediately with the credentials you set.
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-2">User Created Successfully!</h3>
              <p className="text-sm mb-4">Share these credentials with the user:</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{createdCredentials.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <p className="font-mono text-sm">{createdCredentials.password}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={handleClose} className="ms-gradient">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Set initial password"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters. Share this password with the user.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleType">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => {
                  setValue('roleType', value as CreateUserInput['roleType']);
                  // Clear locationIds when switching to org-scoped role
                  if (value === 'SUPERINTENDENT_PHARMACIST') {
                    setValue('locationIds', []);
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERINTENDENT_PHARMACIST">Superintendent Pharmacist (Org-wide)</SelectItem>
                  <SelectItem value="SUPERVISING_PHARMACIST">Supervising Pharmacist (Location-scoped)</SelectItem>
                  <SelectItem value="STAFF">Staff (Location-scoped)</SelectItem>
                </SelectContent>
              </Select>
              {errors.roleType && (
                <p className="text-sm text-destructive">{errors.roleType.message}</p>
              )}
            </div>

            {isPharmacistRole && (
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">PCN License Number</Label>
                <Input
                  id="licenseNumber"
                  placeholder="PCN-12345"
                  {...register('licenseNumber')}
                  disabled={isSubmitting}
                />
                {errors.licenseNumber && (
                  <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
                )}
              </div>
            )}

            {isLocationScoped && locations && locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="locationIds">Location</Label>
                <Select
                  value={selectedLocationIds[0] || ''}
                  onValueChange={(value) => setValue('locationIds', [value])}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name || 'Unnamed Location'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locationIds && (
                  <p className="text-sm text-destructive">{errors.locationIds.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required for location-scoped roles
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
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
                disabled={isSubmitting}
                className="ms-gradient"
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
