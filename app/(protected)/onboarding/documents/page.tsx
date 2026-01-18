'use client';

import { useOrg } from '@/store/useOrg';
import { useOnboardingStatus } from '@/features/onboarding/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Mail,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const VERIFICATION_EMAIL = 'admin@terasync.ng';

export default function DocumentsPage() {
  const { pharmacyId } = useOrg();
  const { data: status, isLoading, error } = useOnboardingStatus(pharmacyId);

  // Show error if pharmacyId is missing
  if (!pharmacyId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pharmacy Not Found</AlertTitle>
        <AlertDescription>
          Unable to load pharmacy information. Please ensure you are logged in and associated with a pharmacy.
          <Link href="/dashboard" className="block mt-2 text-primary hover:underline">
            Go to Dashboard →
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading documents information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Documents</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load onboarding status. Please try again later.'}
          <Link href="/onboarding" className="block mt-2 text-primary hover:underline">
            Back to Onboarding →
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Status Found</AlertTitle>
        <AlertDescription>
          Unable to retrieve pharmacy onboarding status. Please try refreshing the page.
          <Link href="/onboarding" className="block mt-2 text-primary hover:underline">
            Back to Onboarding →
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const requiredDocuments = [
    {
      name: 'PCN Certificate',
      description: 'Pharmaceutical Council of Nigeria registration certificate',
    },
    {
      name: 'CAC Registration',
      description: 'Corporate Affairs Commission business registration document',
    },
    {
      name: 'Pharmacist License',
      description: 'Valid pharmacist license for Superintendent and Supervising Pharmacists',
    },
    {
      name: 'Government ID',
      description: 'Valid government-issued identification (National ID, Driver\'s License, or International Passport)',
    },
    {
      name: 'Other Supporting Documents',
      description: 'Any additional documents required for verification',
    },
  ];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/onboarding">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Onboarding
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Verification Documents</h1>
          <p className="text-muted-foreground mt-1">
            Send required documents via email for manual verification
          </p>
        </div>

        {/* Main Instructions Card */}
        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Send Documents via Email</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
            <p className="mb-3">
              Please send all required verification documents to our verification team via email.
              We will review your documents manually and update your pharmacy status accordingly.
            </p>
            <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-sm mb-2">Send documents to:</p>
              <a
                href={`mailto:${VERIFICATION_EMAIL}?subject=Pharmacy Verification | ${pharmacyId}&body=Dear TeraSync Verification Team,%0D%0A%0D%0APlease find attached the required verification documents for our pharmacy.%0D%0A%0D%0APharmacy Name: ${status.pharmacyName}%0D%0APharmacy ID: ${pharmacyId}%0D%0A%0D%0AThank you.`}
                className="text-lg font-mono text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                {VERIFICATION_EMAIL}
              </a>
            </div>
            <Button
              asChild
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <a
                href={`mailto:${VERIFICATION_EMAIL}?subject=Pharmacy Verification | ${pharmacyId}&body=Dear TeraSync Verification Team,%0D%0A%0D%0APlease find attached the required verification documents for our pharmacy.%0D%0A%0D%0APharmacy Name: ${status.pharmacyName}%0D%0APharmacy ID: ${pharmacyId}%0D%0A%0D%0AThank you.`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Open Email Client
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        {/* Required Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>
              Please include the following documents in your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requiredDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="p-2 rounded-full bg-muted mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Email Instructions</CardTitle>
            <CardDescription>
              Follow these guidelines when sending your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Subject Line (Required Format)</p>
                  <p className="text-sm text-muted-foreground">
                    Use: &quot;Pharmacy Verification | Pharmacy ID&quot; (e.g., &quot;Pharmacy Verification | {pharmacyId}&quot;)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Include Pharmacy Information</p>
                  <p className="text-sm text-muted-foreground">
                    Mention your Pharmacy Name and Pharmacy ID in the email body
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">File Formats</p>
                  <p className="text-sm text-muted-foreground">
                    Send documents as PDF, JPEG, or PNG files. Ensure files are clear and legible.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">File Size</p>
                  <p className="text-sm text-muted-foreground">
                    Keep individual files under 10MB. If files are larger, consider compressing them or sending multiple emails.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Review Time</p>
                  <p className="text-sm text-muted-foreground">
                    Our team typically reviews documents within 1-2 business days. You'll be notified once your pharmacy status is updated.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Info */}
        {status.governanceStatus === 'INCOMPLETE' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Complete Your Setup</AlertTitle>
            <AlertDescription>
              To activate your pharmacy, ensure you have a Superintendent Pharmacist assigned and at least one location created.
              Once complete, an admin will review and approve your pharmacy.
            </AlertDescription>
          </Alert>
        )}
      </div>
  );
}
