'use client';

import { useAuth } from '@/features/auth/hooks';
import { useOrg } from '@/store/useOrg';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import { useLoadPharmacyContext } from '@/features/governance/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useChatOrdersSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { AuthUser } from '@/lib/zod-schemas';
import { getDefaultPermissions } from '@/lib/permissions';
import Link from 'next/link';
import type { GovernanceStatus, PharmacyRoleType } from '@/features/onboarding/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SetupStatusAlert } from '@/components/governance/SetupStatusAlert';
import type { PharmacyProfileResponse } from '@/features/pharmacy/service';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const { pharmacyId, setPharmacy } = useOrg();
  const { setContext, governanceStatus, canOperate, isTestMode } = usePharmacyContext();
  const authUser = user as AuthUser | undefined;
  const role = authUser?.role;
  const isAdmin = role === 'ADMIN';
  const shouldEnforceVerification = role === 'PHARMACY_OWNER' || role === 'PHARMACIST';

  // Fetch pharmacy profile for pharmacy roles
  // Enable query when user is authenticated and is a pharmacy role (not admin)
  const { data: pharmacyProfile, isLoading: pharmacyProfileLoading, error: pharmacyProfileError } = usePharmacyProfile({
    enabled: isAuthenticated && !isAdmin && shouldEnforceVerification,
  });

  // Load pharmacy governance context
  const { isContextLoaded } = useLoadPharmacyContext({
    enabled: !isAdmin && !!pharmacyId,
  });

  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize socket connection for all protected pages
  useChatOrdersSocket();

  // Legacy verification status for backward compatibility
  const verificationStatusRaw = authUser?.verificationStatus || 'pending';
  const verificationStatus = typeof verificationStatusRaw === 'string'
    ? verificationStatusRaw.toLowerCase()
    : 'pending';
  const verificationNotes = authUser?.verificationNotes || '';
  const isAwaitingVerification = shouldEnforceVerification && verificationStatus !== 'approved';

  // Routes that require active pharmacy status
  const activeRequiredPrefixes = useMemo(
    () => ['/orders', '/chat', '/dispatch', '/financials'],
    []
  );
  const isActiveRequiredRoute =
    pathname !== null &&
    activeRequiredPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Routes blocked when pharmacy not active (governance or legacy verification)
  const isBlockedByGovernance = isActiveRequiredRoute && !canOperate;
  const isBlockedByVerification = isAwaitingVerification && isActiveRequiredRoute;
  const isBlockedRoute = isBlockedByGovernance || isBlockedByVerification;

  // Force refresh: admin@terasync.ng (updated 2026-01-10)
  const verificationEmail = 'admin@terasync.ng';

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    const userData = user as { id?: string; email?: string; role?: string } | null;
    console.log('🔍 Protected Layout Debug:', {
      isAuthenticated,
      user: userData ? { id: userData.id, email: userData.email, role: userData.role } : null,
      pharmacyProfile,
      pharmacyProfileType: typeof pharmacyProfile,
      pharmacyProfileKeys: pharmacyProfile ? Object.keys(pharmacyProfile) : null,
      pharmacyProfileLoading,
      pharmacyProfileError,
      governanceStatus,
      canOperate,
      isContextLoaded,
      pathname,
    });
  }

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect pharmacy owners without a pharmacy to signup
  useEffect(() => {
    // Only check if we're done loading and user is authenticated
    if (!isLoading && isAuthenticated && !isAdmin && authUser?.role === 'PHARMACY_OWNER') {
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on signup/login pages
      if (currentPath === '/signup' || currentPath === '/login') {
        return;
      }

      // Wait for pharmacy profile to finish loading
      if (pharmacyProfileLoading) {
        return;
      }

      // Check if profile has pharmacy data
      // New structure: { pharmacy: {...}, pharmacyUser: {...}, operationalStatus: {...} }
      const profileData = pharmacyProfile as { pharmacy?: { id: string } } | null | undefined;
      const hasPharmacy = profileData?.pharmacy?.id;

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [REDIRECT CHECK]', {
          hasPharmacy: !!hasPharmacy,
          pharmacyId: profileData?.pharmacy?.id,
          profileIsNull: pharmacyProfile === null,
        });
      }

      // Redirect pharmacy owners without a pharmacy to signup
      if (pharmacyProfile === null && !pharmacyProfileError) {
        router.push('/signup');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, authUser, pharmacyProfile, pharmacyProfileLoading, pharmacyProfileError, router]);

  // Set pharmacy info in org store and context
  useEffect(() => {
    if (!isAdmin && pharmacyProfile) {
      // pharmacyProfile is now PharmacyProfileResponse with full structure
      const profileData = pharmacyProfile as {
        pharmacy?: {
          id: string;
          name: string;
          governanceStatus?: GovernanceStatus;
          approvalMode?: 'PRODUCTION' | 'TEST';
        };
        pharmacyUser?: {
          roleType?: PharmacyRoleType;
          permissions?: Record<string, unknown>;
        };
        operationalStatus?: {
          canOperate: boolean;
          governanceStatus: GovernanceStatus;
          adminApproved: boolean;
          approvalMode: 'PRODUCTION' | 'TEST';
          isTestMode: boolean;
          reasons?: string[];
        };
        role?: string;
      };

      const pharmacy = profileData.pharmacy;
      if (!pharmacy) return;

      // Set pharmacy in org store
      if (pharmacy.id && !pharmacyId) {
        setPharmacy(pharmacy.id, pharmacy.name);
      }

      // CRITICAL: Use operationalStatus from backend as single source of truth
      const opStatus = profileData.operationalStatus;
      const roleType = profileData.pharmacyUser?.roleType || 'STAFF';
      const govStatus = opStatus?.governanceStatus || pharmacy.governanceStatus || 'INCOMPLETE';
      const canOp = opStatus?.canOperate ?? false; // Default to false if not provided
      const mode = opStatus?.approvalMode || pharmacy.approvalMode || 'PRODUCTION';
      const testMode = opStatus?.isTestMode ?? (mode === 'TEST');

      // Get permissions from the frontend permission config (single source of truth for UI permissions)
      const derivedPermissions = getDefaultPermissions(roleType as PharmacyRoleType);

      // Always update context with latest data from backend
      setContext({
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        roleType: roleType as PharmacyRoleType,
        permissions: derivedPermissions,
        governanceStatus: govStatus,
        canOperate: canOp,
        approvalMode: mode,
        isTestMode: testMode,
      });
    }
  }, [pharmacyProfile, pharmacyId, setPharmacy, isAdmin, setContext]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.error('🔴 [AUTH DEBUG] User not authenticated - returning null (NO REDIRECT)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Redirect disabled for debugging. Check console for details.</p>
        </div>
      </div>
    );
  }

  const profileOperationalStatus = (pharmacyProfile as PharmacyProfileResponse | null | undefined)
    ?.operationalStatus;
  const bannerGovernanceStatus =
    profileOperationalStatus?.governanceStatus ?? governanceStatus;

  const getGovernanceMessage = () => {
    switch (bannerGovernanceStatus) {
      case 'INCOMPLETE':
        return {
          description:
            profileOperationalStatus?.reasons?.join(' ') ||
            'Complete pharmacy setup to activate orders and chat.',
        };
      case 'SUSPENDED':
        return {
          description: 'Your pharmacy has been suspended. Please contact support for assistance.',
        };
      default:
        return {
          description: 'Your pharmacy is pending activation.',
        };
    }
  };

  return (
    <ErrorBoundary>
    <div>
      {/* Desktop sidebar */}
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
        <main className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {/* Test Mode Banner (AC-TEST-02) */}
          {isTestMode && (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 dark:bg-purple-950 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  TEST MODE
                </span>
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  This pharmacy is operating in test mode. Normal approval requirements are bypassed.
                </span>
              </div>
            </div>
          )}

          {/* Legacy verification warning (backward compatibility) */}
          {isAwaitingVerification && !governanceStatus && (
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

          {/* Governance setup banner — driven by live operationalStatus from profile */}
          {!isAdmin && (
            <SetupStatusAlert
              governanceStatus={bannerGovernanceStatus}
              operationalStatus={profileOperationalStatus}
            />
          )}

          {/* Blocked route content */}
          {isBlockedRoute ? (
            <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-dashed border-amber-300 bg-card p-8 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-foreground">
                {governanceStatus === 'SUSPENDED' ? 'Pharmacy Suspended' : 'Awaiting Activation'}
              </h2>
              <p className="text-muted-foreground">
                {governanceStatus
                  ? getGovernanceMessage().description
                  : 'We\'ve limited access to order, chat, dispatch, and inventory features until your pharmacy is approved.'}
              </p>

              {/* Show governance-specific guidance */}
              {bannerGovernanceStatus === 'INCOMPLETE' && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                  <p className="font-medium">To complete activation:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {!profileOperationalStatus?.requirements?.hasSuperintendent && (
                      <li>Add a Superintendent Pharmacist to your team</li>
                    )}
                    {!profileOperationalStatus?.requirements?.hasLocations && (
                      <li>Create at least one pharmacy location</li>
                    )}
                    {!profileOperationalStatus?.adminApproved && (
                      <li>Wait for platform admin approval</li>
                    )}
                  </ul>
                  <Link
                    href="/pharmacy-team"
                    className="mt-3 inline-flex items-center text-sm font-medium text-amber-700 underline"
                  >
                    Go to Pharmacy Team Dashboard &rarr;
                  </Link>
                </div>
              )}

              {/* Legacy verification guidance */}
              {!governanceStatus && isAwaitingVerification && (
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
                    and we&apos;ll confirm once your account is live.
                  </p>
                </div>
              )}

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
    </ErrorBoundary>
  );
}
