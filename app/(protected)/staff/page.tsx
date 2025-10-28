'use client';

import { usePharmacyStaff } from '@/features/pharmacy/hooks';
import { useOrg } from '@/store/useOrg';
import { StaffTable } from '@/components/staff/StaffTable';
import { InviteDialog } from '@/components/staff/InviteDialog';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Users } from 'lucide-react';

export default function StaffPage() {
  const { pharmacyId } = useOrg();
  const { data: staff, isLoading } = usePharmacyStaff(pharmacyId);

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Manage your pharmacy team members
          </p>
        </div>
        {pharmacyId && <InviteDialog pharmacyId={pharmacyId} />}
      </div>

      {/* Staff Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <StaffTable staff={staff || []} />
      )}

      {/* Role Descriptions */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Role Permissions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              Pharmacy Owner
            </h3>
            <p className="text-sm text-muted-foreground">
              Full system access including staff management, settings, locations, and all operations.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              Pharmacist
            </h3>
            <p className="text-sm text-muted-foreground">
              Operational features including orders, chat, dispatch monitoring, and patient interactions.
            </p>
          </div>
        </div>
      </div>
      </div>
    </RoleGuard>
  );
}

