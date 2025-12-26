'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Building2, Bell, Plus } from 'lucide-react';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle, Mail } from 'lucide-react';
import { Pharmacy } from '@/lib/zod-schemas';

type PharmacyWithVerification = Pharmacy & {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string | null;
  verifiedAt?: string | null;
};

type PharmacyProfileResponse = 
  | PharmacyWithVerification
  | { pharmacy: PharmacyWithVerification | null }
  | null
  | undefined;

export default function SettingsPage() {
  const { data: pharmacy, isLoading, error } = usePharmacyProfile();
  const pharmacyData = pharmacy as PharmacyProfileResponse;
  
  // ✅ FIX: Extract profile from nested or direct structure
  // Backend returns: { success: true, data: { pharmacy: {...} } }
  // Frontend service may unwrap to: { pharmacy: {...} } or just {...}
  const profile: PharmacyWithVerification | null = 
    pharmacyData && typeof pharmacyData === 'object' && 'pharmacy' in pharmacyData
      ? pharmacyData.pharmacy
      : (pharmacyData && typeof pharmacyData === 'object' && 'id' in pharmacyData)
      ? pharmacyData as PharmacyWithVerification
      : null;
  
  // ✅ FIX: Debug logging to see what we're getting
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Settings Page - Profile Data:', {
      pharmacyData,
      profile,
      verificationStatus: profile?.verificationStatus,
      hasVerificationStatus: !!profile?.verificationStatus,
      profileKeys: profile ? Object.keys(profile) : null
    });
  }
  
  // ✅ FIX: Normalize verification status (handle both 'approved' and 'APPROVED')
  const verificationStatusRaw = profile?.verificationStatus || 'pending';
  const verificationStatus = typeof verificationStatusRaw === 'string'
    ? verificationStatusRaw.toLowerCase()
    : 'pending';
  const verificationNotes = profile?.verificationNotes || '';
  const verificationEmail = 'admin@medsync.ng';

  const statusConfig = (() => {
    switch (verificationStatus) {
      case 'approved':
        return {
          label: 'Verified Pharmacy',
          className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40',
          icon: <ShieldCheck className="h-4 w-4" />,
          description: 'Your pharmacy is approved to process orders and dispatch medication.',
        };
      case 'rejected':
        return {
          label: 'Verification Rejected',
          className: 'bg-destructive/10 text-destructive border-destructive/40',
          icon: <AlertTriangle className="h-4 w-4" />,
          description: 'We could not verify your pharmacy. Review the notes below and resubmit your documents.',
        };
      default:
        return {
          label: 'Pending Verification',
          className: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <Clock className="h-4 w-4" />,
          description: 'Send in your license and ID so we can manually approve your pharmacy.',
        };
    }
  })();
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    newOrders: true,
    chatMessages: true,
    dispatchUpdates: true,
  });

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      }
      toast.success(`${key === 'newOrders' ? 'New Orders' : key === 'chatMessages' ? 'Chat Messages' : 'Dispatch Updates'} notifications ${updated[key] ? 'enabled' : 'disabled'}`);
      return updated;
    });
  };

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load notification preferences:', e);
        }
      }
    }
  }, []);
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Settings Page Debug:', {
      pharmacy,
      pharmacyData,
      profile,
      isLoading,
      error,
      pharmacyType: typeof pharmacy,
      pharmacyKeys: pharmacy ? Object.keys(pharmacy) : null
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your pharmacy configuration
          </p>
        </div>
        <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">
            Failed to load pharmacy information. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Check if pharmacy is null (user hasn't registered a pharmacy yet)
  if (pharmacyData && 'pharmacy' in pharmacyData && pharmacyData.pharmacy === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your pharmacy configuration
          </p>
        </div>
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">No Pharmacy Registered</h3>
              <p className="text-sm text-blue-700">
                You need to register a pharmacy before you can access settings. Please complete the pharmacy registration process.
              </p>
            </div>
            <Link href="/signup">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Register Pharmacy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your pharmacy configuration
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Pharmacy Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Pharmacy Profile
            </CardTitle>
            <CardDescription>
              Basic information about your pharmacy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={statusConfig.className}>
                  <span className="flex items-center gap-1">
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </Badge>
                {verificationStatus !== 'approved' && (
                  <a
                    href={`mailto:${verificationEmail}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {verificationEmail}
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
              {verificationStatus !== 'approved' && (
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  <li>Attach your PCN license and supervising pharmacist ID.</li>
                  <li>Include the email and phone number linked to this account.</li>
                </ul>
              )}
              {verificationStatus === 'rejected' && verificationNotes && (
                <p className="text-sm font-medium text-destructive">
                  Reviewer notes: {verificationNotes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Pharmacy Name</Label>
              <Input
                id="name"
                defaultValue={profile?.name || 'Not available'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                defaultValue={profile?.licenseNumber || 'Not available'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Primary Address</Label>
              <Input
                id="address"
                defaultValue={profile?.address || 'Not available'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                defaultValue={profile?.phone || 'Not available'}
                disabled
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Contact support to update pharmacy information
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Orders</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new orders arrive
                </p>
              </div>
              <Switch
                checked={notifications.newOrders}
                onCheckedChange={() => handleNotificationToggle('newOrders')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chat Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of new patient messages
                </p>
              </div>
              <Switch
                checked={notifications.chatMessages}
                onCheckedChange={() => handleNotificationToggle('chatMessages')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dispatch Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of delivery status changes
                </p>
              </div>
              <Switch
                checked={notifications.dispatchUpdates}
                onCheckedChange={() => handleNotificationToggle('dispatchUpdates')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </RoleGuard>
  );
}

