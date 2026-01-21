'use client';

import { Menu, LogOut, Shield, UserCheck, Clock, ShieldCheck, AlertTriangle, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth, useLogout } from '@/features/auth/hooks';
import { OrgSwitcher } from './OrgSwitcher';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { NotificationsDropdown } from '@/components/common/NotificationsDropdown';
import { AdminNotificationPanel } from '@/components/admin/NotificationPanel';
import { AuthUser } from '@/lib/zod-schemas';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const authUser = user as AuthUser | undefined;
  
  // Check user role
  const isAdmin = authUser?.role === 'ADMIN';
  const isPharmacyRole = authUser?.role === 'PHARMACIST' || authUser?.role === 'PHARMACY_OWNER';
  
  // Only show verification status for pharmacy roles, not admins
  const verificationStatusRaw = isPharmacyRole ? (authUser?.verificationStatus || 'pending') : null;
  const verificationNotes = authUser?.verificationNotes || '';
  const verificationStatus = verificationStatusRaw && typeof verificationStatusRaw === 'string'
    ? verificationStatusRaw.toLowerCase()
    : null;

  const statusConfig = verificationStatus ? (() => {
    switch (verificationStatus) {
      case 'approved':
        return {
          label: 'Verified Pharmacy',
          className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40',
          icon: <ShieldCheck className="h-3 w-3" />,
        };
      case 'rejected':
        return {
          label: 'Verification Rejected',
          className: 'bg-destructive/10 text-destructive border-destructive/40',
          icon: <AlertTriangle className="h-3 w-3" />,
        };
      default:
        return {
          label: 'Pending Verification',
          className: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <Clock className="h-3 w-3" />,
        };
    }
  })() : null;

  // Generate user initials from database data
  const initials = authUser?.firstName && authUser?.lastName
    ? `${authUser.firstName[0]}${authUser.lastName[0]}`.toUpperCase()
    : authUser?.firstName
    ? authUser.firstName[0].toUpperCase()
    : authUser?.email
    ? authUser.email[0].toUpperCase()
    : 'U';

  // Get user display name
  const displayName = authUser?.firstName && authUser?.lastName
    ? `${authUser.firstName} ${authUser.lastName}`
    : authUser?.firstName
    ? authUser.firstName
    : authUser?.email
    ? authUser.email
    : 'User';

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 flex-1">
          {/* Only show OrgSwitcher for pharmacy roles, not admins */}
          {!isAdmin && <OrgSwitcher />}
          {isAdmin && (
            <div className="flex items-center gap-x-2 text-sm">
              <span className="font-medium text-muted-foreground">Admin Dashboard</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Notifications - Use AdminNotificationPanel for admins, NotificationsDropdown for pharmacy users */}
          {isAdmin ? <AdminNotificationPanel /> : <NotificationsDropdown />}

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <Badge 
                      variant={
                        isAdmin 
                          ? 'default' 
                          : authUser?.role === 'PHARMACY_OWNER' 
                          ? 'default' 
                          : 'secondary'
                      }
                      className={`text-xs ${isAdmin ? 'bg-purple-500/10 text-purple-700 border-purple-500/40' : ''}`}
                    >
                      {isAdmin ? (
                        <>
                          <UserCog className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : authUser?.role === 'PHARMACY_OWNER' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Pharmacy Owner
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Pharmacist
                        </>
                      )}
                    </Badge>
                  </div>
                  {statusConfig && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs leading-none text-muted-foreground">
                    {authUser?.email}
                  </p>
                  {verificationStatus === 'rejected' && verificationNotes && (
                    <p className="text-xs text-destructive mt-1">
                      {verificationNotes}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout.mutate()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}