'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'At least 8 characters long',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains at least one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains at least one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains at least one number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contains at least one special character (!@#$%^&*...)',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password),
  }));

  const metCount = requirements.filter((req) => req.met).length;
  const totalCount = requirements.length;
  const strengthPercentage = (metCount / totalCount) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage === 100) return 'bg-green-500';
    if (strengthPercentage >= 60) return 'bg-yellow-500';
    if (strengthPercentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage === 100) return 'Strong';
    if (strengthPercentage >= 60) return 'Good';
    if (strengthPercentage >= 40) return 'Fair';
    return 'Weak';
  };

  const isValid = metCount === totalCount;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password Strength</span>
          <span
            className={cn(
              'font-medium',
              strengthPercentage === 100 && 'text-green-600',
              strengthPercentage >= 60 && strengthPercentage < 100 && 'text-yellow-600',
              strengthPercentage >= 40 && strengthPercentage < 60 && 'text-orange-600',
              strengthPercentage < 40 && 'text-red-600'
            )}
          >
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full transition-all duration-300', getStrengthColor())}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-2 text-xs transition-colors',
              req.met ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span className={cn(req.met && 'font-medium')}>{req.label}</span>
          </div>
        ))}
      </div>

      {/* Validation Message */}
      {password && (
        <div
          className={cn(
            'rounded-md border p-2 text-xs',
            isValid
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          )}
        >
          {isValid ? (
            <p className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Password meets all requirements
            </p>
          ) : (
            <p className="flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" />
              Please meet all requirements above
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Validate password against backend requirements
 * Returns array of error messages (empty if valid)
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

/**
 * Check if password is valid
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}
