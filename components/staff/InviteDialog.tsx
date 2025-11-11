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
import { useInviteStaff, useLocations } from '@/features/pharmacy/hooks';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'PHARMACIST', 'DISPATCH', 'VIEWER']),
  locationId: z.string().optional(),
});

type InviteInput = z.infer<typeof inviteSchema>;

interface InviteDialogProps {
  pharmacyId: string;
}

export function InviteDialog({ pharmacyId }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const inviteStaff = useInviteStaff(pharmacyId);
  const { data: locations } = useLocations(pharmacyId);

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
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'PHARMACIST',
    },
  });

  const selectedRole = watch('role');
  const selectedLocationId = watch('locationId');

  const onSubmit = async (data: InviteInput) => {
    try {
      const result = await inviteStaff.mutateAsync({
        email: data.email,
        role: data.role,
        locationId: data.locationId || undefined
      });
      
      toast.success(
        result.inviteLink 
          ? 'Invitation sent! Share the link with the staff member.'
          : 'Staff member added successfully!'
      );
      
      if (result.inviteLink && process.env.NODE_ENV === 'development') {
        console.log('Invitation link:', result.inviteLink);
      }
      
      setOpen(false);
      reset();
    } catch (error: any) {
      console.error('Failed to invite staff:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to invite staff member';
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ms-gradient">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your pharmacy team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              {...register('email')}
              disabled={inviteStaff.isPending}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as 'ADMIN' | 'PHARMACIST')}
              disabled={inviteStaff.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin - Full system access</SelectItem>
                <SelectItem value="PHARMACIST">Pharmacist - All operations</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {locations && locations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="locationId">Location (Optional)</Label>
              <Select
                value={selectedLocationId || '__all__'}
                onValueChange={(value) => setValue('locationId', value === '__all__' ? undefined : value)}
                disabled={inviteStaff.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name || 'Unnamed Location'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign staff to a specific location, or select "All Locations" for access to all branches
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={inviteStaff.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteStaff.isPending}
              className="ms-gradient"
            >
              {inviteStaff.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

