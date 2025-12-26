'use client';

import { useAuth } from '@/features/auth/hooks';
import { useOrg } from '@/store/useOrg';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useChatOrdersSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { AuthUser } from '@/lib/zod-schemas';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const { pharmacyId, setPharmacy } = useOrg();
  const authUser = user as AuthUser | undefined;
  const role = authUser?.role;
  const isAdmin = role === 'ADMIN';
  const shouldEnforceVerification = role === 'PHARMACY_OWNER' || role === 'PHARMACIST';
  // Only fetch pharmacy profile for pharmacy roles, not admins
  // Explicitly disable for admins to prevent 403 errors
  const { data: pharmacyProfile, isLoading: pharmacyProfileLoading, error: pharmacyProfileError } = usePharmacyProfile({
    enabled: !isAdmin && shouldEnforceVerification,
  });
  const pathname = usePathname();
  
  // CRITICAL: All hooks must be called before any conditional returns
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize socket connection globally for all protected pages
  // The hook itself will check if user is pharmacy role and has pharmacyId
  // Admins won't connect to pharmacy rooms
  useChatOrdersSocket();
  
  const verificationStatusRaw = authUser?.verificationStatus || 'pending';
  const verificationStatus = typeof verificationStatusRaw === 'string'
    ? verificationStatusRaw.toLowerCase()
    : 'pending';
  const verificationNotes = authUser?.verificationNotes || '';
  const isAwaitingVerification = shouldEnforceVerification && verificationStatus !== 'approved';
  const blockedPrefixes = useMemo(
    () => ['/dashboard', '/orders', '/chat', '/dispatch', '/locations'],
    []
  );
  const isBlockedRoute =
    isAwaitingVerification &&
    pathname !== null &&
    blockedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const verificationEmail = 'admin@medsync.ng';

  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Protected Layout Debug:', {
      isAuthenticated,
      user,
      pharmacyProfile,
      pharmacyProfileLoading,
      pharmacyProfileError
    });
  }


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect PHARMACY_OWNER users without pharmacy to complete registration
  // Skip this for admin users
  useEffect(() => {
    if (isAuthenticated && !isAdmin && authUser?.role === 'PHARMACY_OWNER' && !pharmacyProfileLoading) {
      // Check if user doesn't have a pharmacy assigned
      const pharmacyData = pharmacyProfile as { pharmacy: { id: string } | null } | null | undefined;
      if (pharmacyData && pharmacyData.pharmacy === null) {
        // Only redirect if we're not already on the signup page and not on the login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/signup' && currentPath !== '/login') {
          router.push('/signup');
        }
      }
    }
  }, [isAuthenticated, isAdmin, authUser, pharmacyProfile, pharmacyProfileLoading, router]);

  useEffect(() => {
    // Set pharmacy ID from pharmacy profile if available (skip for admins)
    if (!isAdmin) {
      const pharmacyData = pharmacyProfile as { id?: string; name?: string; pharmacy?: { id: string; name: string } } | null | undefined;
      const pharmacyIdToSet = pharmacyData?.pharmacy?.id || pharmacyData?.id;
      const pharmacyNameToSet = pharmacyData?.pharmacy?.name || pharmacyData?.name;
      if (pharmacyIdToSet && !pharmacyId && pharmacyNameToSet) {
        setPharmacy(pharmacyIdToSet, pharmacyNameToSet);
      }
    }
  }, [pharmacyProfile, pharmacyId, setPharmacy, isAdmin]);

  // Socket connection is now handled by individual page hooks
  // No need for global socket management in layout

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      {/* Desktop sidebar - always visible on large screens */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:block lg:w-64">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar />
          </div>
        </>
      )}

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
          {isAwaitingVerification && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold uppercase tracking-wide text-xs text-amber-700">Verification Pending</span>
                </div>
                <p className="text-sm">
                  Thanks for registering your pharmacy. Please email your PCN license, supervising pharmacist ID, and account email to{' '}
                  <a className="font-semibold underline" href={`mailto:${verificationEmail}`}>
                    {verificationEmail}
                  </a>{' '}
                  so our team can approve your account.
                </p>
                {verificationNotes && (
                  <p className="text-sm font-medium text-amber-900">
                    Notes from reviewer: {verificationNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {isBlockedRoute ? (
            <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-dashed border-amber-300 bg-card p-8 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-foreground">Awaiting Manual Verification</h2>
              <p className="text-muted-foreground">
                We’ve limited access to order, chat, dispatch, and inventory features until your pharmacy is approved.
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                <p className="font-medium">To complete verification, send:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Pharmacy Council of Nigeria (PCN) license for this location</li>
                  <li>Government-issued ID for the supervising pharmacist</li>
                  <li>The email + phone number used for this registration</li>
                </ul>
                <p className="mt-3">
                  Email everything to{' '}
                  <a className="font-semibold underline" href={`mailto:${verificationEmail}`}>
                    {verificationEmail}
                  </a>{' '}
                  and we’ll confirm once your account is live.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can still review settings or contact support while we finish the review.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

