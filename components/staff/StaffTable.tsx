'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PharmacyUser } from '@/lib/zod-schemas';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/hooks';

interface StaffTableProps {
  staff: PharmacyUser[];
}

const roleColors = {
  PHARMACY_OWNER: 'bg-purple-100 text-purple-800',
  PHARMACIST: 'bg-blue-100 text-blue-800',
  ADMIN: 'bg-purple-100 text-purple-800', // Legacy support
  DISPATCH: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

const roleLabels = {
  PHARMACY_OWNER: 'Pharmacy Owner',
  PHARMACIST: 'Pharmacist',
  ADMIN: 'Admin', // Legacy support
  DISPATCH: 'Dispatch',
  VIEWER: 'Viewer',
};

export function StaffTable({ staff }: StaffTableProps) {
  const { user } = useAuth();
  
  // Create a combined list including current user if they're not already in the staff list
  const allStaff = [...staff];
  
  // Add current user if they're not already in the staff list
  if (user && !staff.find(member => member.id === user.id)) {
    
    // Try different ways to get the name
    let fullName = 'Unknown';
    
    // Check if firstName and lastName exist and are not undefined/null
    if (user.firstName && user.lastName && user.firstName !== 'undefined' && user.lastName !== 'undefined') {
      fullName = `${user.firstName} ${user.lastName}`.trim();
    } else if (user.name && user.name !== 'undefined') {
      fullName = user.name;
    } else if (user.firstName && user.firstName !== 'undefined') {
      fullName = user.firstName;
    } else if (user.lastName && user.lastName !== 'undefined') {
      fullName = user.lastName;
    } else if (user.email) {
      // Fallback to email if no name fields
      fullName = user.email.split('@')[0].replace(/[._]/g, ' ');
    }
    
    allStaff.unshift({
      id: user.id,
      name: fullName,
      email: user.email || 'Unknown',
      role: user.role as any,
      createdAt: new Date().toISOString(), // Use current date as fallback
      updatedAt: new Date().toISOString(),
    });
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allStaff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No staff members found
              </TableCell>
            </TableRow>
          ) : (
            allStaff.map((member: any) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.name || `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || member.email}
                  {member.id === user?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                  )}
                </TableCell>
                <TableCell>{member.email || member.user?.email}</TableCell>
                <TableCell>
                  <Badge className={roleColors[member.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}>
                    {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.location?.name || <span className="text-muted-foreground">All Locations</span>}
                </TableCell>
                <TableCell>
                  {format(new Date(member.createdAt || member.acceptedAt || new Date()), 'MMM dd, yyyy')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

