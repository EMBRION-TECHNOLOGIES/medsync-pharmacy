'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { GovernanceStatus } from '@/features/onboarding/types';
import type { PharmacyProfileResponse } from '@/features/pharmacy/service';

interface SetupStatusAlertProps {
  governanceStatus: GovernanceStatus | null | undefined;
  operationalStatus?: PharmacyProfileResponse['operationalStatus'];
}

export function SetupStatusAlert({
  governanceStatus,
  operationalStatus,
}: SetupStatusAlertProps) {
  if (!governanceStatus || governanceStatus === 'ACTIVE') {
    return null;
  }

  if (governanceStatus === 'SUSPENDED') {
    return (
      <Alert className="mb-6 border-red-200 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100 dark:border-red-800">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertTitle className="text-red-900 dark:text-red-100">Pharmacy Suspended</AlertTitle>
        <AlertDescription className="mt-2 text-red-800 dark:text-red-200">
          <p>Your pharmacy has been suspended. Please contact support for assistance.</p>
          <a
            href="mailto:support@terasync.ng"
            className="mt-3 inline-flex items-center text-sm font-medium text-red-700 underline dark:text-red-300"
          >
            Contact Support →
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  const req = operationalStatus?.requirements;
  const adminApproved = operationalStatus?.adminApproved ?? false;
  const isTestMode = operationalStatus?.isTestMode ?? false;

  const checklist = [
    {
      done: req?.hasSuperintendent ?? false,
      label: 'Superintendent Pharmacist on your team',
      href: '/pharmacy-team',
    },
    {
      done: req?.hasLocations ?? false,
      label: 'At least one active pharmacy location',
      href: '/settings',
    },
    ...(!isTestMode
      ? [
          {
            done: adminApproved,
            label: 'Platform admin approval',
            href: null as string | null,
          },
        ]
      : []),
  ];

  const allMet = checklist.every((item) => item.done);
  const title = allMet ? 'Setup complete — activating' : 'Setup Incomplete';

  const description = allMet
    ? 'All requirements are met. Your pharmacy should show as active shortly. Refresh if this banner persists.'
    : 'Complete the items below to activate your pharmacy.';

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">{title}</AlertTitle>
      <AlertDescription className="mt-2 text-amber-800 dark:text-amber-200">
        <p>{description}</p>
        <ul className="mt-3 space-y-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              )}
              <span className={item.done ? 'line-through opacity-70' : ''}>
                {item.label}
                {!item.done && item.href && (
                  <>
                    {' — '}
                    <Link href={item.href} className="font-medium underline text-amber-700 dark:text-amber-300">
                      fix now
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!allMet && (
          <Link
            href="/pharmacy-team"
            className="mt-3 inline-flex items-center text-sm font-medium text-amber-700 underline dark:text-amber-300"
          >
            Complete Setup →
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
