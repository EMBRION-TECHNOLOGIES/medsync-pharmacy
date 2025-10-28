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
import { useInviteStaff } from '@/features/pharmacy/hooks';
import { UserPlus } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'PHARMACIST', 'DISPATCH', 'VIEWER']),
});

type InviteInput = z.infer<typeof inviteSchema>;

interface InviteDialogProps {
  pharmacyId: string;
}

export function InviteDialog({ pharmacyId }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const inviteStaff = useInviteStaff(pharmacyId);

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

  const onSubmit = async (data: InviteInput) => {
    try {
      await inviteStaff.mutateAsync(data);
      setOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to invite staff:', error);
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Pharmacy ID is required')) {
          alert('You need to complete pharmacy registration before inviting staff members.');
        } else if (error.message.includes('404')) {
          alert('Pharmacy management endpoint not available. Please contact support.');
        } else {
          alert('Failed to invite staff member. Please try again.');
        }
      }
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

