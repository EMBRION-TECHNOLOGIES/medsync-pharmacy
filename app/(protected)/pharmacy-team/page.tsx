'use client';

import { useState, useMemo } from 'react';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { usePharmacyTeam, useRemovePerson, useReactivatePerson } from '@/features/pharmacy-team/hooks';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, CheckCircle, Clock, Trash2, Pencil, UserPlus, Users } from 'lucide-react';
import { AddPersonModal } from '@/components/pharmacy-team/AddPersonModal';
import { EditPersonModal } from '@/components/pharmacy-team/EditPersonModal';
import { REQUIRED_GOVERNANCE_ROLES, ROLE_TYPE_DISPLAY } from '@/features/onboarding/types';
import type { TeamMember } from '@/features/pharmacy-team/service';

const ROLE_TYPE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_TYPE_DISPLAY).map(([key, value]) => [key, value.name])
);

export default function PharmacyTeamPage() {
  const { pharmacyName } = usePharmacyContext();
  const { data: team, isLoading, error } = usePharmacyTeam();
  const removePersonMutation = useRemovePerson();
  const reactivatePersonMutation = useReactivatePerson();

  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [editPersonOpen, setEditPersonOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showFormerMembers, setShowFormerMembers] = useState(false);

  const handleEditClick = (member: TeamMember) => {
    setSelectedMember(member);
    setEditPersonOpen(true);
  };

  // Split team into active and former members
  const { activeMembers, formerMembers } = useMemo(() => {
    if (!team) return { activeMembers: [], formerMembers: [] };
    
    return {
      activeMembers: team.filter((m) => m.isActive),
      formerMembers: team.filter((m) => !m.isActive),
    };
  }, [team]);

  // Display list based on toggle
  const displayedMembers = showFormerMembers ? formerMembers : activeMembers;

  // Get required roles that are missing (check for active members only)
  const confirmedRoles = activeMembers
    .filter((m) => m.status === 'active' || m.status === 'confirmed')
    .map((m) => m.roleType);
  const missingRoles = REQUIRED_GOVERNANCE_ROLES.filter(
    (role) => !confirmedRoles.includes(role)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading pharmacy team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load pharmacy team</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <RoleGuard
      allowedRoles={['PHARMACY_OWNER']}
      fallback={<div>Only pharmacy owners can access this page.</div>}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pharmacy Team</h1>
            <p className="text-muted-foreground mt-1">
              Manage your pharmacy's team members and roles
            </p>
          </div>
          <Button onClick={() => setAddPersonOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>

        {/* Required Roles Checklist */}
        {missingRoles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Required Roles Missing</CardTitle>
              <CardDescription>
                The following roles must be confirmed before your pharmacy can become fully active:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {missingRoles.map((role) => (
                  <li key={role} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>{ROLE_TYPE_DISPLAY_NAMES[role]}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Team Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {showFormerMembers ? (
                    <>
                      <Users className="h-5 w-5" />
                      Former Team Members
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Active Team Members
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {showFormerMembers
                    ? `${formerMembers.length} former member${formerMembers.length !== 1 ? 's' : ''} - can be reactivated`
                    : `${activeMembers.length} active member${activeMembers.length !== 1 ? 's' : ''} at ${pharmacyName}`}
                </CardDescription>
              </div>
              {formerMembers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-former"
                    checked={showFormerMembers}
                    onCheckedChange={setShowFormerMembers}
                  />
                  <Label htmlFor="show-former" className="text-sm text-muted-foreground cursor-pointer">
                    View former members ({formerMembers.length})
                  </Label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {!showFormerMembers && <TableHead>Status</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMembers.length > 0 ? (
                  displayedMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.roleDisplayName}</TableCell>
                      {!showFormerMembers && (
                        <TableCell>
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {showFormerMembers ? (
                            // Former members: show reactivate button
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Reactivate ${member.name}? They will regain access to the pharmacy immediately.`
                                  )
                                ) {
                                  reactivatePersonMutation.mutate(member.id);
                                }
                              }}
                              disabled={reactivatePersonMutation.isPending}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          ) : (
                            // Active members: show edit and remove buttons
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(member)}
                                title="Edit team member"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {member.roleType !== 'PHARMACY_OWNER' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Remove ${member.name} from the team? Their access will be revoked immediately.`
                                      )
                                    ) {
                                      removePersonMutation.mutate({
                                        personId: member.id,
                                        reason: 'Removed by owner',
                                      });
                                    }
                                  }}
                                  disabled={removePersonMutation.isPending}
                                  title="Remove team member"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showFormerMembers ? 4 : 5} className="text-center text-muted-foreground py-8">
                      {showFormerMembers
                        ? 'No former team members.'
                        : 'No team members yet. Click "Add Person" to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modals */}
        <AddPersonModal open={addPersonOpen} onOpenChange={setAddPersonOpen} />
        <EditPersonModal 
          open={editPersonOpen} 
          onOpenChange={setEditPersonOpen} 
          member={selectedMember}
        />
      </div>
    </RoleGuard>
  );
}