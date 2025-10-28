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
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/features/auth/hooks';

// Navigation items with role-based access
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['PHARMACY_OWNER', 'PHARMACIST'] },
  { name: 'Orders', href: '/orders', icon: Package, roles: ['PHARMACY_OWNER', 'PHARMACIST'] },
  { name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['PHARMACY_OWNER', 'PHARMACIST'] },
  { name: 'Dispatch', href: '/dispatch', icon: Truck, roles: ['PHARMACY_OWNER', 'PHARMACIST'] },
  { name: 'Staff', href: '/staff', icon: Users, roles: ['PHARMACY_OWNER'] },
  { name: 'Locations', href: '/locations', icon: MapPin, roles: ['PHARMACY_OWNER'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['PHARMACY_OWNER'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter navigation items based on user role
  const filteredNavigation = navigationItems.filter(item => 
    (user as any)?.role && item.roles.includes((user as any).role)
  );

  return (
    <div className="flex w-64 flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center mt-4 mb-12">
          <Image
            src="/medsync_logo.svg"
            alt="MedSync"
            width={120}
            height={40}
            priority
            // style={{ width: "auto", height: "auto" }}
          />
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

