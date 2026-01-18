'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/store/useOrg';
import { useAuth } from '@/features/auth/hooks';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useOnboardingStatus } from '@/features/onboarding/hooks';
import { GOVERNANCE_STATUS_DISPLAY } from '@/features/onboarding/types';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  MapPin,
  FileText,
  ArrowRight,
} from 'lucide-react';

export default function OnboardingPage() {
  const { pharmacyId } = useOrg();
  const { user } = useAuth();
  const { roleType, isLoaded: isContextLoaded } = usePharmacyContext();
  const { data: status, isLoading, error } = useOnboardingStatus(pharmacyId);

  const isPharmacyOwner = user?.role === 'PHARMACY_OWNER';

  if (isLoading || !isContextLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading onboarding status...</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Status</AlertTitle>
          <AlertDescription>
            Unable to load pharmacy onboarding status. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isPharmacyOwner) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>
          Only pharmacy owners can access the onboarding dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  const { pharmacyName: contextPharmacyName } = usePharmacyContext();

  const safeStatus = {
    ...status,
    statusDetails: status.statusDetails || {
      status: status.governanceStatus,
      hasSuperintendent: false,
      hasLocations: false,
      documentsUploaded: false,
      adminApproved: false,
      canOperate: false,
      missingRequirements: [],
      pendingDocuments: [],
    },
    pharmacyName: status.pharmacyName || contextPharmacyName || 'Unknown Pharmacy',
    governanceStatus: status.governanceStatus || 'INCOMPLETE',
  };

  const statusDisplay = GOVERNANCE_STATUS_DISPLAY[safeStatus.governanceStatus] || {
    label: 'Unknown Status',
    color: 'gray',
    description: 'Unable to determine pharmacy status.',
  };

  const missingRequirements = safeStatus.statusDetails.missingRequirements || [];
  const hasSuperintendent = safeStatus.statusDetails.hasSuperintendent;
  const hasLocations = safeStatus.statusDetails.hasLocations;

  return (
    <PermissionGuard
      roleTypes={['PHARMACY_OWNER']}
      hideOnDenied={false}
      fallback={
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loading Pharmacy Context</AlertTitle>
            <AlertDescription>
              Please wait while we load your pharmacy information.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacy Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Complete your pharmacy setup to start receiving orders
          </p>
        </div>

        {/* Governance Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{safeStatus.pharmacyName}</CardTitle>
                <CardDescription>Governance Status</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  statusDisplay.color === 'orange'
                    ? 'text-orange-700 border-orange-200 bg-orange-50'
                    : statusDisplay.color === 'green'
                    ? 'text-green-700 border-green-200 bg-green-50'
                    : statusDisplay.color === 'red'
                    ? 'text-red-700 border-red-200 bg-red-50'
                    : 'text-gray-700 border-gray-200 bg-gray-50'
                }
              >
                {statusDisplay.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{statusDisplay.description}</p>

            {/* Requirements Checklist */}
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {hasSuperintendent ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Superintendent Pharmacist</p>
                    <p className="text-sm text-muted-foreground">
                      Required for pharmacy operations
                    </p>
                  </div>
                </div>
                {!hasSuperintendent && (
                  <Link href="/staff">
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {hasLocations ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Locations</p>
                    <p className="text-sm text-muted-foreground">
                      At least one active location required
                    </p>
                  </div>
                </div>
                {!hasLocations && (
                  <Link href="/locations">
                    <Button size="sm" variant="outline">
                      <MapPin className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {safeStatus.statusDetails.documentsUploaded ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Documents</p>
                    <p className="text-sm text-muted-foreground">
                      Send verification documents to admin@terasync.ng
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        {safeStatus.governanceStatus === 'INCOMPLETE' && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Complete these steps to activate your pharmacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!hasSuperintendent && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Add Superintendent Pharmacist</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create a user account for your Superintendent Pharmacist. They must have a valid PCN license.
                    </p>
                    <Link href="/staff">
                      <Button size="sm">
                        Go to Staff Management
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {!hasLocations && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Create Locations</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add at least one location (branch) for your pharmacy. Orders will be assigned to locations.
                    </p>
                    <Link href="/locations">
                      <Button size="sm">
                        Go to Locations
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {hasSuperintendent && hasLocations && !safeStatus.statusDetails.adminApproved && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Send Verification Documents</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Email your verification documents to admin@terasync.ng for review. Include:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mb-2 space-y-1">
                      <li>PCN Registration Certificate</li>
                      <li>CAC Registration Document</li>
                      <li>Pharmacist License</li>
                      <li>Government-Issued ID</li>
                      <li>Proof of Premises</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      After admin approval, your pharmacy will be activated.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Status */}
        {safeStatus.governanceStatus === 'ACTIVE' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Pharmacy Active</AlertTitle>
            <AlertDescription>
              Your pharmacy is fully activated and ready to receive orders. You can start managing orders, staff, and locations from the dashboard.
            </AlertDescription>
          </Alert>
        )}

        {/* Suspended Status */}
        {safeStatus.governanceStatus === 'SUSPENDED' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pharmacy Suspended</AlertTitle>
            <AlertDescription>
              Your pharmacy has been suspended. Please contact support at admin@terasync.ng for assistance.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </PermissionGuard>
  );
}
