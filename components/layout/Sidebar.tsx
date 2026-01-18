'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Truck,
  Users,
  MapPin,
  Settings,
  ShieldCheck,
  DollarSign,
  FileCheck,
  ScrollText,
  Building2,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/features/auth/hooks';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { checkPermission } from '@/lib/permissions';
import type { Permissions } from '@/lib/permissions';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  // Permission-based access
  permission?: { category: keyof Permissions; action: string };
  // Role-based access (for admins or specific roles)
  roles?: string[];
  // Requires pharmacy to be approved and operational
  requiresApproval?: boolean;
  // Always show but disabled when not accessible
  showDisabled?: boolean;
  // Only show during onboarding (before approval)
  onboardingOnly?: boolean;
  // Always visible regardless of approval status
  alwaysVisible?: boolean;
}

// Navigation items with permission-based access control
const navigationItems: NavItem[] = [
  // === ALWAYS VISIBLE ===
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    alwaysVisible: true, // Dashboard always visible
  },
  
  // === ONBOARDING ONLY (Before Approval) ===
  {
    name: 'Pharmacy Team',
    href: '/pharmacy-team',
    icon: Users,
    roles: ['PHARMACY_OWNER'],
    onboardingOnly: true, // Only show before approval
  },
  {
    name: 'Documents & Compliance',
    href: '/documents',
    icon: FileCheck,
    roles: ['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST'],
    onboardingOnly: true, // Only show before approval
  },
  
  // === REQUIRES APPROVAL (After Admin Approval) ===
  {
    name: 'Orders',
    href: '/orders',
    icon: Package,
    permission: { category: 'orders', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageSquare,
    permission: { category: 'orders', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Dispatch',
    href: '/dispatch',
    icon: Truck,
    permission: { category: 'dispatch', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Financials',
    href: '/financials',
    icon: DollarSign,
    permission: { category: 'financials', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Staff',
    href: '/staff',
    icon: Users,
    permission: { category: 'staff', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: MapPin,
    permission: { category: 'locations', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Compliance',
    href: '/compliance',
    icon: FileCheck,
    permission: { category: 'compliance', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    icon: ScrollText,
    permission: { category: 'auditLogs', action: 'view' },
    requiresApproval: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: { category: 'settings', action: 'view' },
    roles: ['PHARMACY_OWNER'],
    alwaysVisible: true, // Settings always visible for owners to see pharmacy status
  },
  
  // === ADMIN-ONLY ROUTES ===
  {
    name: 'Pharmacy Verification',
    href: '/admin/verification',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
  {
    name: 'Governance Review',
    href: '/admin/governance',
    icon: Building2,
    roles: ['ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions, canOperate, roleType, isLoaded, governanceStatus } = usePharmacyContext();

  // Determine home route based on user role
  const isAdmin = user?.role === 'ADMIN';
  const homeRoute = isAdmin ? '/admin/verification' : '/dashboard';

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sidebar.tsx:RENDER',message:'Sidebar render state',data:{userRole:user?.role,roleType,canOperate,isLoaded,governanceStatus,hasPermissions:!!permissions,permissionKeys:permissions?Object.keys(permissions):null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
  // #endregion

  // For non-admin users, wait for context to be loaded before showing full nav
  // This prevents flash of incomplete sidebar
  const isContextReady = isAdmin || (isLoaded && permissions && Object.keys(permissions).length > 2);

  // Determine if pharmacy is approved (can operate)
  const isApproved = canOperate === true;

  const filteredItems = navigationItems.filter((item) => {
    // ADMIN users should ONLY see admin-specific routes
    if (isAdmin) {
      if (item.roles) {
        return item.roles.includes('ADMIN');
      }
      return false;
    }

    // For non-admin users (pharmacy roles):
    
    // If context not ready, only show Dashboard
    if (!isContextReady && !item.alwaysVisible) {
      return false;
    }

    // Always visible items pass through
    if (item.alwaysVisible) {
      return true;
    }

    // Onboarding-only items: Show ONLY when NOT approved
    if (item.onboardingOnly) {
      if (isApproved) {
        return false;
      }
      // Check role access for onboarding items
      if (item.roles) {
        const effectiveRole = roleType || user?.role;
        if (!effectiveRole || !item.roles.includes(effectiveRole)) {
          return false;
        }
      }
      return true;
    }

    // Items requiring approval: Show ONLY when approved
    if (item.requiresApproval && !isApproved) {
      return false;
    }

    // Check role-based access (explicit role requirements)
    if (item.roles) {
      const effectiveRole = roleType || user?.role;
      if (!effectiveRole || !item.roles.includes(effectiveRole)) {
        return false;
      }
    }

    // Check permission-based access (only for approved pharmacies)
    if (item.permission && isApproved) {
      if (!permissions) {
        return false;
      }
      if (!checkPermission(permissions, item.permission.category, item.permission.action)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href={homeRoute} className="flex items-center space-x-2">
          <Image
            src="/terasync_logo.png"
            alt="TeraSync Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="text-lg font-semibold">TeraSync</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}