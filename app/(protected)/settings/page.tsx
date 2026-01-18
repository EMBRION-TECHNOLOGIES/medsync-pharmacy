'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { 
  Building2, 
  Bell, 
  Plus, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Mail,
  MapPin,
  Phone,
  Globe,
  Users,
  FileText,
  Settings2,
  Palette,
  Lock,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Info
} from 'lucide-react';
import { usePharmacyProfile, useLocations } from '@/features/pharmacy/hooks';
import { useOrg } from '@/store/useOrg';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pharmacy } from '@/lib/zod-schemas';
import { format } from 'date-fns';

type GovernanceStatus = 'INCOMPLETE' | 'ACTIVE' | 'SUSPENDED';

type PharmacyWithVerification = Pharmacy & {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  governanceStatus?: GovernanceStatus;
  adminApproved?: boolean;
  adminApprovedAt?: string | null;
  createdAt?: string;
  email?: string;
  displayName?: string;
};

type PharmacyProfileResponse = {
  pharmacy: PharmacyWithVerification | null;
  pharmacyUser?: {
    roleType?: string;
  };
  operationalStatus?: {
    canOperate: boolean;
    governanceStatus: GovernanceStatus;
    adminApproved: boolean;
    reasons: string[];
    requirements: {
      hasSuperintendent: boolean;
      superintendentCount: number;
      hasLocations: boolean;
      locationCount: number;
      hasActiveLocationsWithSupervisors: boolean;
    };
  };
} | null | undefined;

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {Icon && (
        <div className="mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'Not set'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, type }: { status: string; type: 'governance' | 'verification' | 'approval' }) {
  const configs = {
    governance: {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      INCOMPLETE: { label: 'Incomplete', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      SUSPENDED: { label: 'Suspended', className: 'bg-red-100 text-red-800', icon: XCircle },
    },
    verification: {
      approved: { label: 'Verified', className: 'bg-green-100 text-green-800', icon: ShieldCheck },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
    },
    approval: {
      true: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      false: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    },
  };

  const config = configs[type][status as keyof typeof configs[typeof type]] || configs[type][Object.keys(configs[type])[0] as keyof typeof configs[typeof type]];
  const IconComponent = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <IconComponent className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export default function SettingsPage() {
  const { pharmacyId } = useOrg();
  const { roleType } = usePharmacyContext();
  const { data: pharmacyResponse, isLoading, error, refetch } = usePharmacyProfile();
  const { data: locations } = useLocations(pharmacyId);
  
  const pharmacyData = pharmacyResponse as PharmacyProfileResponse;
  const profile = pharmacyData?.pharmacy;
  const operationalStatus = pharmacyData?.operationalStatus;
  const isOwner = roleType === 'PHARMACY_OWNER';
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    newOrders: true,
    chatMessages: true,
    dispatchUpdates: true,
    lowStock: false,
    dailyReport: false,
  });

  const [activeTab, setActiveTab] = useState('general');

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      }
      toast.success(`Notification ${updated[key] ? 'enabled' : 'disabled'}`);
      return updated;
    });
  };

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        try {
          setNotifications(prev => ({ ...prev, ...JSON.parse(saved) }));
        } catch (e) {
          console.error('Failed to load notification preferences:', e);
        }
      }
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Loading pharmacy settings...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your pharmacy configuration</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Failed to load settings</p>
                <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your pharmacy configuration</p>
        </div>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">No Pharmacy Registered</h3>
                <p className="text-sm text-blue-700">
                  Complete the registration process to access settings.
                </p>
              </div>
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Pharmacy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verificationStatus = (profile.verificationStatus || 'pending').toLowerCase();
  const governanceStatus = operationalStatus?.governanceStatus || profile.governanceStatus || 'INCOMPLETE';

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your pharmacy configuration and preferences
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Overview */}
        <Card className="bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profile.displayName || profile.name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={governanceStatus} type="governance" />
                    <StatusBadge status={verificationStatus} type="verification" />
                    {operationalStatus?.adminApproved !== undefined && (
                      <StatusBadge status={String(operationalStatus.adminApproved)} type="approval" />
                    )}
                  </div>
                </div>
              </div>
              {operationalStatus && (
                <div className="flex items-center gap-2">
                  {operationalStatus.canOperate ? (
                    <Badge className="bg-green-600 text-white px-3 py-1">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Operational
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="px-3 py-1">
                      <XCircle className="h-4 w-4 mr-1" />
                      Not Operational
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Operational Requirements */}
            {operationalStatus && !operationalStatus.canOperate && operationalStatus.reasons.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Action Required</p>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      {operationalStatus.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pharmacy Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Pharmacy Information
                  </CardTitle>
                  <CardDescription>
                    Basic details about your pharmacy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow label="Pharmacy Name" value={profile.name} icon={Building2} />
                  <Separator />
                  <InfoRow label="Display Name" value={profile.displayName || profile.name} />
                  <Separator />
                  <InfoRow label="License Number" value={profile.licenseNumber || 'Not provided'} icon={FileText} />
                  <Separator />
                  <InfoRow label="Address" value={profile.address} icon={MapPin} />
                  <Separator />
                  <InfoRow label="Phone" value={profile.phone || 'Not set'} icon={Phone} />
                  <Separator />
                  <InfoRow label="Email" value={profile.email || 'Not set'} icon={Mail} />
                  
                  {profile.createdAt && (
                    <>
                      <Separator />
                      <InfoRow 
                        label="Registered On" 
                        value={format(new Date(profile.createdAt), 'MMMM d, yyyy')} 
                        icon={Clock} 
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account & Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Account & Access
                  </CardTitle>
                  <CardDescription>
                    Your account information and access details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pharmacy ID</p>
                        <p className="font-mono text-sm">{pharmacyId || profile.id}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(pharmacyId || profile.id || '', 'Pharmacy ID')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Role</p>
                      <Badge variant="outline" className="mt-1">
                        {roleType?.replace(/_/g, ' ') || 'Unknown'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Quick Links</h4>
                    <div className="grid gap-2">
                      <Link href="/staff">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Staff
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      </Link>
                      <Link href="/locations">
                        <Button variant="outline" className="w-full justify-start">
                          <MapPin className="h-4 w-4 mr-2" />
                          Manage Locations
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      </Link>
                      <Link href="/compliance">
                        <Button variant="outline" className="w-full justify-start">
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          View Compliance
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Contact our support team for assistance with account changes, verification, or technical issues.
                    </p>
                  </div>
                  <a href="mailto:support@terasync.ng">
                    <Button>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Pharmacy Locations
                    </CardTitle>
                    <CardDescription>
                      Manage your pharmacy branches and locations
                    </CardDescription>
                  </div>
                  <Link href="/locations">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {locations && locations.length > 0 ? (
                  <div className="space-y-3">
                    {locations.map((location: any) => (
                      <div 
                        key={location.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {location.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                          <Badge variant={location.isActive !== false ? 'default' : 'secondary'}>
                            {location.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-semibold mb-1">No Locations</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your first pharmacy location to start operations
                    </p>
                    <Link href="/locations">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Notifications */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Order Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          New Orders
                        </Label>
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
                        <Label className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Dispatch Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified of delivery status changes
                        </p>
                      </div>
                      <Switch
                        checked={notifications.dispatchUpdates}
                        onCheckedChange={() => handleNotificationToggle('dispatchUpdates')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Communication Notifications */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Communication</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Chat Messages
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified of new patient messages
                        </p>
                      </div>
                      <Switch
                        checked={notifications.chatMessages}
                        onCheckedChange={() => handleNotificationToggle('chatMessages')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Reports */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Reports & Alerts</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Low Stock Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when inventory is running low
                        </p>
                      </div>
                      <Switch
                        checked={notifications.lowStock}
                        onCheckedChange={() => handleNotificationToggle('lowStock')}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Daily Summary Report
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive a daily summary of orders and revenue
                        </p>
                      </div>
                      <Switch
                        checked={notifications.dailyReport}
                        onCheckedChange={() => handleNotificationToggle('dailyReport')}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Compliance Status
                </CardTitle>
                <CardDescription>
                  Your pharmacy's regulatory compliance and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Governance</span>
                    </div>
                    <StatusBadge status={governanceStatus} type="governance" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Verification</span>
                    </div>
                    <StatusBadge status={verificationStatus} type="verification" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Admin Approval</span>
                    </div>
                    <StatusBadge 
                      status={String(operationalStatus?.adminApproved || false)} 
                      type="approval" 
                    />
                  </div>
                </div>

                {/* Requirements Checklist */}
                {operationalStatus?.requirements && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Operational Requirements</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        {operationalStatus.requirements.hasSuperintendent ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">Superintendent Pharmacist</p>
                          <p className="text-sm text-muted-foreground">
                            {operationalStatus.requirements.superintendentCount} registered
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        {operationalStatus.requirements.hasLocations ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">Active Locations</p>
                          <p className="text-sm text-muted-foreground">
                            {operationalStatus.requirements.locationCount} location(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        {operationalStatus.requirements.hasActiveLocationsWithSupervisors ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">Supervising Pharmacists</p>
                          <p className="text-sm text-muted-foreground">
                            Each location has a supervising pharmacist
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                  <Link href="/compliance">
                    <Button className="w-full sm:w-auto">
                      <FileText className="h-4 w-4 mr-2" />
                      View Full Compliance Details
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}

// Import for MessageSquare used in notifications
import { MessageSquare, ShoppingCart } from 'lucide-react';
