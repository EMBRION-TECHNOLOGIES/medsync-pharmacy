'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { pharmacyRegistrationSchema, type PharmacyRegistrationInput } from '@/lib/zod-schemas';
import { useRegister } from '@/features/auth/hooks';
import { onboardingService } from '@/features/onboarding/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { PasswordStrength, isPasswordValid } from '@/components/ui/password-strength';
import {
  isLicenseFormatValid,
  getLicenseJurisdictionHint,
  normalizeLicense,
  LICENSE_FORMAT_ERROR,
  LICENSE_SOFT_WARNING,
} from '@/lib/license-validation';

type PharmacyRegistrationForm = PharmacyRegistrationInput;

type ApiErrorResponse = {
  response?: {
    status?: number;
    data?: {
      error?: { message?: string };
      message?: string;
    };
  };
};

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isValidatingLicense, setIsValidatingLicense] = useState(false);
  const [licenseValidationStatus, setLicenseValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'pending'>('idle');
  // Only pharmacy owners can register a pharmacy
  const selectedRole = 'PHARMACY_OWNER' as const;
  const register = useRegister();
  const router = useRouter();
  const verificationEmail = 'admin@terasync.ng';
  
  const {
    register: registerField,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PharmacyRegistrationForm>({
    resolver: zodResolver(pharmacyRegistrationSchema),
  });


  // Geocoding function using browser's geolocation API
  const getCurrentLocation = async () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      console.warn('Geolocation requires HTTPS or localhost. Current origin:', window.location.origin);
      toast.error('Geolocation requires a secure connection (HTTPS). Please use HTTPS or enter coordinates manually.');
      return;
    }

    setIsGeocoding(true);

    const options = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          console.log('✅ Location obtained:', { latitude, longitude, accuracy: position.coords.accuracy });

          // Set coordinates
          setValue('latitude', latitude);
          setValue('longitude', longitude);

          // Reverse geocode via our proxy (avoids CORS, User-Agent, and "Failed to fetch")
          try {
            const res = await fetch(
              `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`
            );
            const json = await res.json();
            const data = json.success ? json.data : null;

            if (data?.display_name) {
              const addressParts = data.display_name.split(',');
              const shortAddress = addressParts.slice(0, 3).join(', ').trim();
              setValue('address', shortAddress);
            } else {
              setValue('address', `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch (reverseGeoError) {
            console.error('Reverse geocoding error:', reverseGeoError);
            setValue('address', `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }

          setIsGeocoding(false);
          toast.success('Location detected successfully');
        } catch (error: unknown) {
          setIsGeocoding(false);
          console.error('Error processing location:', error);
          toast.error('Failed to process location. Please enter coordinates manually.');
        }
      },
      (error: GeolocationPositionError) => {
        setIsGeocoding(false);

        let errorMessage = 'Could not detect your location. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. ';
            if (!isSecureContext) {
              errorMessage += 'Note: Geolocation requires HTTPS (or localhost). ';
            }
            errorMessage += 'Please check browser permissions or enter coordinates manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please ensure location services are enabled on your device or enter coordinates manually.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or enter coordinates manually.';
            break;
          default:
            errorMessage += 'Please enter coordinates manually.';
        }

        toast.error(errorMessage);
      },
      options
    );
  };


  // License verification (placeholder for future PCN API). Layer 1 = format check; Layer 2 = soft hint only.
  const verifyLicenseWithAPI = async (licenseNumber: string) => {
    setIsValidatingLicense(true);
    setLicenseValidationStatus('validating');

    try {
      await new Promise((r) => setTimeout(r, 1500));

      const formatValid = isLicenseFormatValid(licenseNumber);
      const jurisdiction = getLicenseJurisdictionHint(licenseNumber);

      if (!formatValid) {
        setLicenseValidationStatus('invalid');
        toast.error(LICENSE_FORMAT_ERROR);
        return;
      }

      setLicenseValidationStatus('pending');
      if (jurisdiction === 'known') {
        toast.success('License format valid. Awaiting verification…');
      } else {
        toast.info(LICENSE_SOFT_WARNING);
      }
    } catch {
      setLicenseValidationStatus('invalid');
      toast.error('License verification failed. Please try again.');
    } finally {
      setIsValidatingLicense(false);
    }
  };


  const onSubmitStep1 = async () => {
    // Validate required fields for step 1
    const firstName = watch('firstName');
    const lastName = watch('lastName');
    const email = watch('email');
    const password = watch('password');
    const confirmPassword = watch('confirmPassword');

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // ⚠️ SECURITY: Validate password strength before proceeding
    if (!isPasswordValid(password)) {
      toast.error('Password does not meet security requirements. Please check all requirements above.');
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setCurrentStep(2);
  };

  const onSubmitStep2 = async () => {
    const pharmacyName = watch('pharmacyName');
    const address = watch('address');
    const pharmacyEmail = watch('pharmacyEmail');
    const licenseNumber = watch('licenseNumber');
    const latitude = watch('latitude');
    const longitude = watch('longitude');

    const hasCoordinates = !!latitude && !!longitude;

    if (!pharmacyName || !pharmacyEmail || !licenseNumber) {
      toast.error('Please fill in all required pharmacy information');
      return;
    }

    if (!isLicenseFormatValid(licenseNumber)) {
      toast.error(LICENSE_FORMAT_ERROR);
      return;
    }

    if (!hasCoordinates && !address) {
      toast.error('Please enter a pharmacy address or use GPS location');
      return;
    }

    if (!hasCoordinates) {
      toast.error('Please enter a valid address to get location coordinates');
      return;
    }

    setCurrentStep(3);
  };

  const onSubmitStep3 = async (data: PharmacyRegistrationForm) => {
    setIsLoading(true);
    try {
      // Validate that we have all required data
      if (!data.pharmacyName || !data.pharmacyEmail || !data.licenseNumber || !data.latitude || !data.longitude) {
        toast.error('Please complete all pharmacy information');
        setIsLoading(false);
        return;
      }

      // Check if user is already authenticated (they might be completing pharmacy registration)
      const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('accessToken');
      
      // Prepare pharmacy data for governance onboarding API
      const pharmacyData = {
        name: data.pharmacyName,
        address: data.address || 'Current Location',
        phone: data.phone || '',
        email: data.pharmacyEmail,
        pcnRegistrationNumber: normalizeLicense(data.licenseNumber),
        initiatorRole: 'PHARMACY_OWNER' as const,
      };
      
      if (isAuthenticated) {
        // User is already authenticated, create pharmacy with governance onboarding
        try {
          const result = await onboardingService.createPharmacy(pharmacyData);
          // API interceptor unwraps response, so result.data is the unwrapped data object
          const responseData = result.data || {};
          const message = responseData?.message || 'Pharmacy created successfully!';
          toast.success(message);
          if (responseData?.remainingRoles && responseData.remainingRoles.length > 0) {
            const roleNames = responseData.remainingRoles.map((r: { displayName?: string; roleType: string }) => r.displayName || r.roleType).join(', ');
            toast.info(`Next step: Invite ${responseData.remainingRoles.length} required role(s) (${roleNames}) in the Pharmacy Team section.`);
          } else {
            toast.info('Next step: Invite required roles (Superintendent Pharmacist, Supervising Pharmacist) in the Pharmacy Team section.');
          }
          router.push('/pharmacy-team');
        } catch (pharmacyError: unknown) {
          console.error('Pharmacy creation failed:', pharmacyError);
          const response = (pharmacyError as ApiErrorResponse).response;
          const errorMessage = response?.data?.error?.message || 
                              response?.data?.message ||
                              'Pharmacy registration failed. Please try again.';
          toast.error(errorMessage);
        }
      } else {
        // User is not authenticated, register them first
        const userData = {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: selectedRole,
        };

        // Register the user account
        await register.mutateAsync(userData);
        
        // After user registration, create the pharmacy with governance onboarding
        try {
          const result = await onboardingService.createPharmacy(pharmacyData);
          // API interceptor unwraps response, so result.data is the unwrapped data object
          const responseData = result.data || {};
          
          // Clear any stored tokens - user should log in fresh
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          
          // Pharmacy created successfully - redirect to login
          toast.success('Registration successful! Your pharmacy has been created.');
          toast.info('Please log in to continue setting up your pharmacy.');
          
          if (responseData?.remainingRoles && responseData.remainingRoles.length > 0) {
            const roleNames = responseData.remainingRoles.map((r: { displayName?: string; roleType: string }) => r.displayName || r.roleType).join(', ');
            toast.info(`After login, invite ${responseData.remainingRoles.length} required role(s): ${roleNames}`);
          }
          
          router.push('/login');
          return;
        } catch (pharmacyError: unknown) {
          console.error('Pharmacy creation failed:', pharmacyError);
          
          // Handle 409 Conflict - user already has a pharmacy
          const response = (pharmacyError as ApiErrorResponse).response;
          if (response?.status === 409) {
            const errorMessage = response?.data?.error?.message || 
                                response?.data?.message ||
                                'You already have a pharmacy registered. Please login instead.';
            toast.error(errorMessage);
            // Redirect to login since they already have an account
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
          
          // If pharmacy creation fails, we should ideally rollback user registration
          // For now, show error and let user try again
          const fallbackMessage = response?.data?.error?.message || response?.data?.message;
          const errorMessage =
            fallbackMessage ||
                              'User account created but pharmacy registration failed. Please contact support.';
          toast.error(errorMessage);
          // Don't redirect to login - let user try again
        }
      }
      
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-ms-blue/10 to-ms-green/10 p-4">
      <Card className="w-full max-w-2xl overflow-visible">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image
              src="/terasync_logo.png"
              alt="TeraSync Logo"
              width={150}
              height={50}
              priority
              className="rounded-md"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Pharmacy Registration</CardTitle>
          <CardDescription>
            {currentStep === 1 
              ? 'You\'re registered as a Pharmacy Owner. Complete your pharmacy details to access the full system.'
              : currentStep === 2
              ? 'Enter your pharmacy information'
              : 'Review and complete registration'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === 1) {
              onSubmitStep1();
            } else if (currentStep === 2) {
              onSubmitStep2();
            } else {
              // For step 3, we need to get the form data and call onSubmitStep3 directly
              const data: PharmacyRegistrationForm = {
                role: selectedRole,
                firstName: watch('firstName'),
                lastName: watch('lastName'),
                email: watch('email'),
                password: watch('password'),
                confirmPassword: watch('confirmPassword'),
                phone: watch('phone'),
                pharmacyName: watch('pharmacyName'),
                address: watch('address'),
                pharmacyEmail: watch('pharmacyEmail'),
                licenseNumber: watch('licenseNumber'),
                latitude: watch('latitude'),
                longitude: watch('longitude'),
                description: watch('description'),
              };
              onSubmitStep3(data);
            }
          }} className="space-y-6">
            {currentStep === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...registerField('firstName')}
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...registerField('lastName')}
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@pharmacy.com"
                    {...registerField('email')}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      {...registerField('password')}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      {...registerField('confirmPassword')}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                {watch('password') && (
                  <PasswordStrength password={watch('password') || ''} />
                )}

                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <p className="text-sm font-medium text-primary">Pharmacy Admin Account</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    You are registering as a Pharmacy Owner to create and manage your pharmacy.
                  </p>
                </div>
              </>
            ) : currentStep === 2 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Pharmacy Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your pharmacy details
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                    <Input
                      id="pharmacyName"
                      placeholder="Enter Your Pharmacy Name"
                      {...registerField('pharmacyName')}
                      disabled={isLoading}
                    />
                    {errors.pharmacyName && (
                      <p className="text-sm text-destructive">{errors.pharmacyName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Pharmacy Address</Label>
                    <AddressAutocomplete
                      value={watch('address') || ''}
                      onChange={(value) => setValue('address', value)}
                      onAddressSelect={(address) => {
                        setValue('address', address.formattedAddress);
                        setValue('latitude', address.latitude);
                        setValue('longitude', address.longitude);
                        toast.success('✓ Address verified with coordinates');
                      }}
                      placeholder="Type to search address..."
                      disabled={isLoading}
                      onGeolocation={getCurrentLocation}
                      showGeolocationButton={true}
                      isGeolocating={isGeocoding}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharmacyEmail">Pharmacy Email</Label>
                    <Input
                      id="pharmacyEmail"
                      type="email"
                      placeholder="info@yourpharmacy.com"
                      {...registerField('pharmacyEmail')}
                      disabled={isLoading}
                    />
                    {errors.pharmacyEmail && (
                      <p className="text-sm text-destructive">{errors.pharmacyEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Pharmacy Licence Number (PCN)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="licenseNumber"
                        placeholder="FCT2025CD16C"
                        {...registerField('licenseNumber')}
                        disabled={isLoading}
                        className="flex-1"
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw?.trim()) {
                            setLicenseValidationStatus('idle');
                            return;
                          }
                          setLicenseValidationStatus(
                            isLicenseFormatValid(raw) ? 'valid' : 'invalid'
                          );
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => verifyLicenseWithAPI(watch('licenseNumber') ?? '')}
                        disabled={
                          isLoading ||
                          isValidatingLicense ||
                          !watch('licenseNumber') ||
                          !isLicenseFormatValid(watch('licenseNumber') ?? '')
                        }
                        className="shrink-0"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.licenseNumber && (
                      <p className="text-sm text-destructive">
                        {errors.licenseNumber.message}
                      </p>
                    )}
                    {licenseValidationStatus === 'valid' && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        License format valid
                      </p>
                    )}
                    {licenseValidationStatus === 'pending' && (
                      <p className="text-sm text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Verification pending
                      </p>
                    )}
                    {licenseValidationStatus === 'invalid' && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {LICENSE_FORMAT_ERROR}
                      </p>
                    )}
                    {licenseValidationStatus === 'valid' &&
                      getLicenseJurisdictionHint(watch('licenseNumber') ?? '') === 'unknown' && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {LICENSE_SOFT_WARNING}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the licence number issued by the Pharmacists Council of Nigeria.

                    </p>
                  </div>

                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Review & Submit</h3>
                  <p className="text-sm text-muted-foreground">
                    Confirm your details, then send your documents for manual verification.
                  </p>
                </div>

                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Personal Information</h4>
                    <p className="text-sm text-muted-foreground">
                      {watch('firstName')} {watch('lastName')} ({watch('email')})
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Role</h4>
                    <p className="text-sm text-muted-foreground">Pharmacy Admin</p>
                  </div>

                  <div>
                    <h4 className="font-medium">Pharmacy</h4>
                    <p className="text-sm text-muted-foreground">
                      {watch('pharmacyName')} - {watch('address') || 'Current Location'}
                    </p>
                  </div>
                </div>

                <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800">
                  <AlertTitle>Governance Onboarding Process</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">
                      After registration, you&apos;ll need to complete the governance onboarding process:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      <li><strong>Invite Required Roles:</strong> Send invitations to Superintendent Pharmacist and Supervising Pharmacist</li>
                      <li><strong>Role Confirmations:</strong> Each role must confirm their responsibilities via secure email link</li>
                      <li><strong>Send Documents:</strong> After all roles confirm, email verification documents to <a className="underline font-medium" href={`mailto:${verificationEmail}`}>{verificationEmail}</a></li>
                      <li><strong>Admin Review:</strong> Our team will review and activate your pharmacy</li>
                    </ol>
                    <p className="text-sm mt-2">
                      Once all roles are confirmed, you can access the <strong>Pharmacy Team</strong> section to invite team members and track progress.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {register.error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  {register.error instanceof Error ? register.error.message : 'Registration failed. Please try again.'}
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              
              <Button
                type="submit"
                className={`flex-1 ms-gradient ${currentStep === 1 ? 'ml-auto' : ''}`}
                disabled={isLoading}
              >
                {isLoading 
                  ? 'Processing...' 
                  : currentStep === 1 
                    ? 'Next' 
                    : currentStep === 2
                      ? 'Continue'
                      : 'Complete Registration'
                }
              </Button>
            </div>
          </form>

          <Separator className="my-6" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
