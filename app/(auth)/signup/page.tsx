'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, MapPin, Navigation, Shield, AlertCircle } from 'lucide-react';
import { pharmacyRegistrationSchema, type PharmacyRegistrationInput } from '@/lib/zod-schemas';
import { useRegister } from '@/features/auth/hooks';
import { pharmacyService } from '@/features/pharmacy/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type PharmacyRegistrationForm = PharmacyRegistrationInput;

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isValidatingLicense, setIsValidatingLicense] = useState(false);
  const [licenseValidationStatus, setLicenseValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'pending'>('idle');
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  // Only pharmacy owners can register a pharmacy
  const selectedRole: 'PHARMACY_OWNER' = 'PHARMACY_OWNER';
  const register = useRegister();
  const router = useRouter();
  
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PharmacyRegistrationForm>({
    resolver: zodResolver(pharmacyRegistrationSchema),
  });

  // Geocoding function using browser's geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Use the new coordinate handler that includes reverse geocoding
        await handleCoordinatesUpdate(latitude, longitude);
        
        setIsGeocoding(false);
        toast.success('Location Updated');
      },
      (error) => {
        setIsGeocoding(false);
        toast.error('Could not detect your location. Please enter coordinates manually.');
        console.error('Geolocation error:', error);
      }
    );
  };

  // Simple geocoding function (you can replace with Google Maps API later)
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      toast.error('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    try {
      // Using a free geocoding service (you can replace with Google Maps API)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        // Use the new coordinate handler that includes reverse geocoding
        await handleCoordinatesUpdate(latitude, longitude);
        
        toast.success('Location Recorded');
      } else {
        toast.error('Could not find coordinates for this address');
      }
    } catch (error) {
      toast.error('Error converting address to coordinates');
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // License validation function
  const validateLicenseNumber = (licenseNumber: string): boolean => {
    // Nigerian pharmacy license format validation
    // Format: Usually starts with PH, followed by numbers/letters
    const licensePattern = /^PH[A-Z0-9]{6,12}$/i;
    return licensePattern.test(licenseNumber.trim());
  };

  // License verification function (placeholder for future API integration)
  const verifyLicenseWithAPI = async (licenseNumber: string) => {
    setIsValidatingLicense(true);
    setLicenseValidationStatus('validating');
    
    try {
      // TODO: Replace with actual Nigerian Pharmacy Council API
      // For now, simulate API call with format validation
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      const isValidFormat = validateLicenseNumber(licenseNumber);
      
      if (isValidFormat) {
        // In production, this would call the actual verification API
        setLicenseValidationStatus('pending');
        toast.success('License format valid. Awaiting verification...');
      } else {
        setLicenseValidationStatus('invalid');
        toast.error('Invalid license number format');
      }
    } catch (error) {
      setLicenseValidationStatus('invalid');
      toast.error('License verification failed. Please try again.');
    } finally {
      setIsValidatingLicense(false);
    }
  };

  // Reverse geocoding function to get address from coordinates
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsReverseGeocoding(true);
    
    // Set a timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000); // 5 second timeout
    });
    
    try {
      const geocodingPromise = fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=16`
      ).then(response => response.json());
      
      const data = await Promise.race([geocodingPromise, timeoutPromise]) as any;
      
      if (data && data.display_name) {
        // Format the address nicely - take first few parts for brevity
        const addressParts = data.display_name.split(',');
        const shortAddress = addressParts.slice(0, 3).join(', ').trim();
        setResolvedAddress(shortAddress);
        return shortAddress;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback: create a simple address from coordinates
      const fallbackAddress = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setResolvedAddress(fallbackAddress);
      return fallbackAddress;
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Function to handle coordinate updates and reverse geocoding
  const handleCoordinatesUpdate = async (latitude: number, longitude: number) => {
    setValue('latitude', latitude);
    setValue('longitude', longitude);
    
    // Start reverse geocoding in the background (non-blocking)
    reverseGeocode(latitude, longitude).then((address) => {
      if (address) {
        setValue('address', address);
        setResolvedAddress(address);
      }
    }).catch((error) => {
      console.error('Background reverse geocoding failed:', error);
    });
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
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setCurrentStep(2);
  };

  const onSubmitStep2 = async () => {
    // Validate required fields for step 2
    const pharmacyName = watch('pharmacyName');
    const address = watch('address');
    const pharmacyEmail = watch('pharmacyEmail');
    const licenseNumber = watch('licenseNumber');
    const latitude = watch('latitude');
    const longitude = watch('longitude');
    
    // Check if we have coordinates
    const hasCoordinates = latitude && longitude;
    
    if (!pharmacyName || !pharmacyEmail || !licenseNumber) {
      toast.error('Please fill in all required pharmacy information');
      return;
    }
    
    // Only require address if we don't have coordinates
    if (!hasCoordinates && !address) {
      toast.error('Please enter a pharmacy address or use GPS location');
      return;
    }
    
    // Validate that we have coordinates (either from address or GPS)
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
      
      if (isAuthenticated) {
        // User is already authenticated, just create the pharmacy
        const pharmacyData = {
          name: data.pharmacyName,
          address: data.address || 'Current Location',
          phone: data.phone || '',
          email: data.pharmacyEmail,
          licenseNumber: data.licenseNumber,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description || '',
        };
        
        try {
          await pharmacyService.createPharmacy(pharmacyData);
          toast.success('Pharmacy registration completed! You can now access the full system.');
          router.push('/dashboard');
        } catch (pharmacyError) {
          console.error('Pharmacy creation failed:', pharmacyError);
          toast.error('Pharmacy registration failed. Please try again.');
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
        const result = await register.mutateAsync(userData);
        
        // After user registration, create the pharmacy
        const pharmacyData = {
          name: data.pharmacyName,
          address: data.address || 'Current Location',
          phone: data.phone || '',
          email: data.pharmacyEmail,
          licenseNumber: data.licenseNumber,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description || '',
        };
        
        try {
          await pharmacyService.createPharmacy(pharmacyData);
          toast.success('Registration successful! You can now login with your credentials.');
          router.push('/login');
        } catch (pharmacyError) {
          console.error('Pharmacy creation failed:', pharmacyError);
          // If pharmacy creation fails, we should ideally rollback user registration
          // For now, show error and let user try again
          toast.error('User account created but pharmacy registration failed. Please contact support.');
          // Don't redirect to login - let user try again
        }
      }
      
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ms-blue/10 to-ms-green/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image
              src="/medsync_logo.svg"
              alt="MedSync Logo"
              width={150}
              height={50}
              priority
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
        <CardContent>
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
              const formData = new FormData(e.currentTarget);
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
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        placeholder="123 Main Street, Lagos"
                        {...registerField('address')}
                        disabled={isLoading}
                        className="flex-1"
                        onBlur={() => {
                          // Auto-geocode when user finishes typing address
                          const address = watch('address');
                          if (address && address.trim()) {
                            geocodeAddress(address);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => geocodeAddress(watch('address'))}
                        disabled={isLoading || isGeocoding || !watch('address')}
                        className="shrink-0"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address.message}</p>
                    )}
                    {watch('latitude') && watch('longitude') && (
                      <div className="text-sm text-green-600 font-bold">
                        {isReverseGeocoding ? (
                          <>
                            <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin inline-block mr-1"></div>
                            Resolving address...
                          </>
                        ) : (
                          '✓'
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={isLoading || isGeocoding}
                      className="w-full"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {isGeocoding ? 'Detecting...' : 'Use My Location'}
                    </Button>
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
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="licenseNumber"
                        placeholder="PH123456789"
                        {...registerField('licenseNumber')}
                        disabled={isLoading}
                        className="flex-1"
                        onBlur={(e) => {
                          const licenseNumber = e.target.value;
                          if (licenseNumber && licenseNumber.trim()) {
                            const isValid = validateLicenseNumber(licenseNumber);
                            if (isValid) {
                              setLicenseValidationStatus('valid');
                            } else {
                              setLicenseValidationStatus('invalid');
                            }
                          } else {
                            setLicenseValidationStatus('idle');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => verifyLicenseWithAPI(watch('licenseNumber'))}
                        disabled={isLoading || isValidatingLicense || !watch('licenseNumber')}
                        className="shrink-0"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.licenseNumber && (
                      <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
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
                        Invalid license format
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter your Nigerian Pharmacy Council license number.
                    </p>
                  </div>

                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Review Your Registration</h3>
                  <p className="text-sm text-muted-foreground">
                    Please review your information before completing registration
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
                      {watch('pharmacyName')} - {resolvedAddress || watch('address') || 'Current Location'}
                    </p>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>After registration, you will be able to login and access the pharmacy dashboard.</p>
                  <p>As a pharmacy owner, you can manage staff, locations, and all pharmacy operations.</p>
                </div>
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
