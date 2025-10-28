'use client';

import { Menu, LogOut, Shield, UserCheck } from 'lucide-react';
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

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const logout = useLogout();

  // Generate user initials from database data
  const initials = (user as any)?.firstName && (user as any)?.lastName
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase()
    : (user as any)?.firstName
    ? (user as any).firstName[0].toUpperCase()
    : (user as any)?.email
    ? (user as any).email[0].toUpperCase()
    : 'U';

  // Get user display name
  const displayName = (user as any)?.firstName && (user as any)?.lastName
    ? `${(user as any).firstName} ${(user as any).lastName}`
    : (user as any)?.firstName
    ? (user as any).firstName
    : (user as any)?.email
    ? (user as any).email
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
          <OrgSwitcher />
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Notifications */}
          <NotificationsDropdown />

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
                      variant={(user as any)?.role === 'PHARMACY_OWNER' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {(user as any)?.role === 'PHARMACY_OWNER' ? (
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
                  <p className="text-xs leading-none text-muted-foreground">
                    {(user as any)?.email}
                  </p>
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