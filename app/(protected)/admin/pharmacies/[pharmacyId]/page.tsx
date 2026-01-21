'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Building2,
  Users,
  Package,
  DollarSign,
  ScrollText,
  MapPin,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface PharmacyDetail {
  id: string;
  name: string;
  displayName: string | null;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  cacRegistrationNumber: string | null;
  cacBusinessName: string | null;
  pcnRegistrationNumber: string | null;
  licenseNumber: string | null;
  nafdacLicenseNo: string | null;
  governanceStatus: string;
  approvalMode: string;
  isActive: boolean;
  adminApproved: boolean;
  adminApprovedAt: string | null;
  adminApprover: { firstName: string; lastName: string; email: string } | null;
  adminRejectionNotes: string | null;
  compliance: {
    pcnLicense: { verified: boolean; verifiedAt: string | null };
    cacCertificate: { verified: boolean; verifiedAt: string | null };
    superintendentLicense: { verified: boolean; verifiedAt: string | null };
    premisesLicense: { verified: boolean; verifiedAt: string | null };
    nafdacLicense: { verified: boolean; verifiedAt: string | null };
    namesMatch: { verified: boolean; verifiedAt: string | null };
  };
  payout: {
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
    verified: boolean;
    verifiedAt: string | null;
  };
  locations: Array<{
    id: string;
    name: string;
    address: string;
    phone: string | null;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  counts: {
    orders: number;
    pharmacyUsers: number;
    dispatches: number;
  };
  financials: {
    totalRevenue: number;
    totalOrders: number;
  };
  verificationEvents: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    createdBy: { firstName: string; lastName: string; email: string } | null;
  }>;
  governanceAuditLogs: Array<{
    id: string;
    action: string;
    targetRole: string | null;
    previousValue: string | null;
    newValue: string | null;
    reason: string | null;
    actorName: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface StaffMember {
  id: string;
  userId: string;
  role: string;
  roleType: string;
  isActive: boolean;
  status: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    medSyncId: string | null;
    profileImage: string | null;
    lastLogin: string | null;
    userCreatedAt: string;
  };
  location: { id: string; name: string } | null;
  assignedBy: string | null;
  assignedAt: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface PharmacyOrder {
  id: string;
  orderNumber: string;
  orderCode: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  drugName: string | null;
  quantity: number | null;
  location: { id: string; name: string } | null;
  patient: { id: string; name: string; medSyncId: string | null } | null;
  dispatch: { id: string; status: string; provider: string } | null;
  hasChat: boolean;
  chatRoomId: string | null;
  createdAt: string;
}

interface PharmacyChat {
  orderId: string;
  orderNumber: string;
  orderCode: string | null;
  orderStatus: string;
  drugName: string | null;
  totalAmount: number;
  orderCreatedAt: string;
  patient: { id: string; name: string; medSyncId: string | null } | null;
  chatRoom: {
    id: string;
    type: string;
    isActive: boolean;
    messageCount: number;
    lastMessage: {
      content: string;
      type: string;
      senderName: string;
      createdAt: string;
    } | null;
    createdAt: string;
  } | null;
}

interface ChatMessage {
  id: string;
  content: string;
  messageType: string;
  attachments: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string | null;
    isPatient: boolean;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

const roleTypeLabels: Record<string, string> = {
  PHARMACY_OWNER: 'Owner',
  SUPERINTENDENT_PHARMACIST: 'Superintendent',
  SUPERVISING_PHARMACIST: 'Supervising Pharmacist',
  STAFF: 'Staff',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PharmacyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pharmacyId = params.pharmacyId as string;
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch pharmacy details
  const { data: pharmacy, isLoading: pharmacyLoading, refetch: refetchPharmacy } = useQuery<PharmacyDetail>({
    queryKey: ['admin', 'pharmacy', pharmacyId],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId,
  });

  // Fetch staff (only when tab is active)
  const { data: staffData, isLoading: staffLoading } = useQuery<{
    staff: StaffMember[];
    summary: { total: number; active: number; byRoleType: Record<string, number> };
  }>({
    queryKey: ['admin', 'pharmacy', pharmacyId, 'staff'],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}/staff`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId && activeTab === 'staff',
  });

  // Fetch orders (only when tab is active)
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{
    orders: PharmacyOrder[];
    statusCounts: Record<string, number>;
    pagination: { total: number };
  }>({
    queryKey: ['admin', 'pharmacy', pharmacyId, 'orders'],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}/orders?limit=50`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId && activeTab === 'orders',
  });

  // Fetch chats (only when tab is active)
  const { data: chatsData, isLoading: chatsLoading } = useQuery<{
    chats: PharmacyChat[];
    pagination: { total: number };
  }>({
    queryKey: ['admin', 'pharmacy', pharmacyId, 'chats'],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}/chats?limit=50`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId && activeTab === 'chats',
  });

  // Fetch activity (only when tab is active)
  const { data: activityData, isLoading: activityLoading } = useQuery<{
    activities: Array<{
      id: string;
      type: string;
      action: string;
      details: any;
      actor: string | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ['admin', 'pharmacy', pharmacyId, 'activity'],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}/activity`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId && activeTab === 'activity',
  });

  if (pharmacyLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </RoleGuard>
    );
  }

  if (!pharmacy) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Pharmacy not found</h2>
            <Button className="mt-4" onClick={() => router.push('/admin/pharmacies')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pharmacies
            </Button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/pharmacies')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {pharmacy.displayName || pharmacy.name}
                </h1>
                <Badge className={statusColors[pharmacy.governanceStatus] || 'bg-gray-100'}>
                  {pharmacy.governanceStatus}
                </Badge>
                {pharmacy.approvalMode === 'TEST' && (
                  <Badge variant="outline">TEST MODE</Badge>
                )}
              </div>
              {pharmacy.legalName && pharmacy.legalName !== pharmacy.name && (
                <p className="text-muted-foreground mt-1">Legal: {pharmacy.legalName}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {pharmacy.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {pharmacy.email}
                  </span>
                )}
                {pharmacy.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {pharmacy.phone}
                  </span>
                )}
                {pharmacy.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {pharmacy.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchPharmacy()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/verification?pharmacyId=${pharmacyId}`)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Verification Panel
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pharmacy.counts.pharmacyUsers}</p>
                  <p className="text-sm text-muted-foreground">Staff Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pharmacy.counts.orders}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pharmacy.locations.length}</p>
                  <p className="text-sm text-muted-foreground">Locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(pharmacy.financials.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Display Name</p>
                      <p className="font-medium">{pharmacy.displayName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Legal Name</p>
                      <p className="font-medium">{pharmacy.legalName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{pharmacy.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{pharmacy.phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{pharmacy.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Registered</p>
                      <p className="font-medium">
                        {format(new Date(pharmacy.createdAt), 'PPP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(pharmacy.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registration & Licensing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Registration & Licensing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">CAC Registration</p>
                      <p className="font-medium">{pharmacy.cacRegistrationNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CAC Business Name</p>
                      <p className="font-medium">{pharmacy.cacBusinessName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PCN Registration</p>
                      <p className="font-medium">{pharmacy.pcnRegistrationNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">License Number</p>
                      <p className="font-medium">{pharmacy.licenseNumber || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">NAFDAC License</p>
                      <p className="font-medium">{pharmacy.nafdacLicenseNo || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { key: 'pcnLicense', label: 'PCN License' },
                      { key: 'cacCertificate', label: 'CAC Certificate' },
                      { key: 'superintendentLicense', label: 'Superintendent License' },
                      { key: 'premisesLicense', label: 'Premises License' },
                      { key: 'nafdacLicense', label: 'NAFDAC License' },
                      { key: 'namesMatch', label: 'Names Match Verification' },
                    ].map((item) => {
                      const compliance = pharmacy.compliance[item.key as keyof typeof pharmacy.compliance];
                      return (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <div className="flex items-center gap-2">
                            {compliance.verified ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-muted-foreground">
                                  {compliance.verifiedAt && format(new Date(compliance.verifiedAt), 'PP')}
                                </span>
                              </>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Payout Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payout Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pharmacy.payout.bankName ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="font-medium">{pharmacy.payout.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number</span>
                        <span className="font-medium">{pharmacy.payout.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name</span>
                        <span className="font-medium">{pharmacy.payout.accountName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified</span>
                        {pharmacy.payout.verified ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            Not Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No payout account configured</p>
                  )}
                </CardContent>
              </Card>

              {/* Locations */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Locations ({pharmacy.locations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pharmacy.locations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pharmacy.locations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-medium">
                              {location.name}
                              {location.isPrimary && (
                                <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                              )}
                            </TableCell>
                            <TableCell>{location.address}</TableCell>
                            <TableCell>{location.phone || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={location.isActive ? 'default' : 'secondary'}>
                                {location.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No locations configured</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Members
                  {staffData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({staffData.summary.total} total, {staffData.summary.active} active)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  All team members associated with this pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : staffData?.staff && staffData.staff.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffData.staff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {staff.user.firstName} {staff.user.lastName}
                              </p>
                              {staff.user.medSyncId && (
                                <p className="text-xs text-muted-foreground">
                                  {staff.user.medSyncId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {roleTypeLabels[staff.roleType] || staff.roleType}
                            </Badge>
                          </TableCell>
                          <TableCell>{staff.user.email}</TableCell>
                          <TableCell>
                            {staff.location?.name || (
                              <span className="text-muted-foreground">All locations</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                              {staff.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {staff.user.lastLogin ? (
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(staff.user.lastLogin), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(staff.createdAt), 'PP')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No staff members found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders
                  {ordersData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({ordersData.pagination.total} total)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  All orders processed by this pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : ordersData?.orders && ordersData.orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Drug</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.patient ? (
                              <div>
                                <p className="text-sm">{order.patient.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.patient.medSyncId}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.drugName || '-'}
                            {order.quantity && (
                              <span className="text-muted-foreground ml-1">x{order.quantity}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(order.createdAt), 'PP')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No orders found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chats Tab */}
          <TabsContent value="chats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat History
                  {chatsData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({chatsData.pagination.total} conversations)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Read-only view of all order-related conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chatsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : chatsData?.chats && chatsData.chats.length > 0 ? (
                  <div className="space-y-4">
                    {chatsData.chats.map((chat) => (
                      <div
                        key={chat.orderId}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (chat.chatRoom?.id) {
                            router.push(`/admin/pharmacies/${pharmacyId}/chats/${chat.chatRoom.id}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm font-medium">
                                {chat.orderNumber}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {chat.orderStatus}
                              </Badge>
                              {chat.chatRoom?.isActive ? (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Closed</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              <span>Patient: {chat.patient?.name || 'Unknown'}</span>
                              {chat.drugName && (
                                <span className="ml-4">Drug: {chat.drugName}</span>
                              )}
                              <span className="ml-4">{formatCurrency(chat.totalAmount)}</span>
                            </div>
                            {chat.chatRoom?.lastMessage && (
                              <div className="bg-muted/50 rounded p-2 text-sm">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                  <span className="font-medium">{chat.chatRoom.lastMessage.senderName}</span>
                                  <span>•</span>
                                  <span>
                                    {formatDistanceToNow(new Date(chat.chatRoom.lastMessage.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-muted-foreground line-clamp-2">
                                  {chat.chatRoom.lastMessage.content}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {chat.chatRoom?.messageCount || 0} messages
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(chat.orderCreatedAt), 'PP')}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No chat conversations found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Chats are created when patients place orders through the app
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
                <CardDescription>
                  Revenue and payout information for this pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(pharmacy.financials.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{pharmacy.financials.totalOrders}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                      <p className="text-2xl font-bold">
                        {pharmacy.financials.totalOrders > 0
                          ? formatCurrency(pharmacy.financials.totalRevenue / pharmacy.financials.totalOrders)
                          : formatCurrency(0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payout Account Summary */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Payout Account</h4>
                  {pharmacy.payout.bankName ? (
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Bank</p>
                        <p className="font-medium">{pharmacy.payout.bankName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Account</p>
                        <p className="font-medium">{pharmacy.payout.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{pharmacy.payout.accountName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium">
                          {pharmacy.payout.verified ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" /> Verified
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                              <Clock className="h-4 w-4" /> Pending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No payout account configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Complete audit trail of all actions related to this pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : activityData?.activities && activityData.activities.length > 0 ? (
                  <div className="space-y-4">
                    {activityData.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="shrink-0">
                          {activity.type === 'verification' ? (
                            <Shield className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ScrollText className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="font-medium">{activity.action}</span>
                          </div>
                          {activity.details && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {activity.details.notes && <p>{activity.details.notes}</p>}
                              {activity.details.reason && <p>Reason: {activity.details.reason}</p>}
                              {activity.details.previousValue && activity.details.newValue && (
                                <p>
                                  Changed from &quot;{activity.details.previousValue}&quot; to &quot;{activity.details.newValue}&quot;
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {activity.actor && <span>By: {activity.actor}</span>}
                            <span>{format(new Date(activity.createdAt), 'PPp')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No activity recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
