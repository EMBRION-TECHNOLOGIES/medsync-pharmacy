'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Building2,
  User,
  MapPin,
  Award,
  Users,
  Stethoscope,
  FileCheck,
  Scale
} from 'lucide-react';
import { useOrg } from '@/store/useOrg';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { RoleGuard } from '@/components/auth/RoleGuard';

interface ChecklistItem {
  item: string;
  status: 'complete' | 'pending' | 'missing';
  description: string;
  category?: string;
}

interface AdminVerificationItem {
  verified: boolean;
  verifiedAt: string | null;
}

interface ComplianceData {
  pharmacy: {
    id: string;
    name: string;
    governanceStatus: string;
    adminApproved: boolean;
    adminApprovedAt: string | null;
    approvalMode: string;
    isActive: boolean;
  };
  compliance: {
    score: number;
    checklist: ChecklistItem[];
    documents: any[];
    history: any[];
  };
  licenses: {
    pcnRegistrationNumber: string | null;
    cacRegistrationNumber: string | null;
    cacBusinessName: string | null;
    nafdacLicenseNo: string | null;
    licenseNumber: string | null;
  };
  adminVerification?: {
    pcnLicense: AdminVerificationItem;
    cacCertificate: AdminVerificationItem;
    superintendentLicense: AdminVerificationItem;
    premisesLicense: AdminVerificationItem;
    nafdacLicense: AdminVerificationItem;
    namesMatch: AdminVerificationItem;
  };
  team: {
    superintendent: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    } | null;
    totalStaff: number;
  };
  locations: Array<{
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  }>;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'missing':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'complete':
      return 'border-l-green-500 bg-green-50/50';
    case 'pending':
      return 'border-l-yellow-500 bg-yellow-50/50';
    case 'missing':
      return 'border-l-red-500 bg-red-50/50';
    default:
      return 'border-l-gray-300';
  }
}

export default function CompliancePage() {
  const { pharmacyId } = useOrg();

  const { data: complianceData, isLoading, error } = useQuery({
    queryKey: ['compliance-overview', pharmacyId],
    queryFn: async () => {
      const response = await api.get('/pharmacy/compliance/overview');
      return response.data as ComplianceData;
    },
    enabled: !!pharmacyId,
  });

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <XCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load compliance data</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </RoleGuard>
    );
  }

  const data = complianceData;

  if (!data) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
            <p className="text-muted-foreground">
              Manage your pharmacy's regulatory compliance
            </p>
          </div>
          
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No compliance data available</h2>
              <p className="text-muted-foreground max-w-md">
                Complete your pharmacy setup to view compliance status.
              </p>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  const { pharmacy, compliance, licenses, adminVerification, team, locations } = data;

  // Calculate category-specific scores
  const checklistByCategory = {
    personnel: compliance.checklist.filter(c => 
      c.item.toLowerCase().includes('superintendent') || 
      c.item.toLowerCase().includes('pharmacist') ||
      c.item.toLowerCase().includes('staff')
    ),
    premises: compliance.checklist.filter(c => 
      c.item.toLowerCase().includes('location') || 
      c.item.toLowerCase().includes('premises')
    ),
    registration: compliance.checklist.filter(c => 
      c.item.toLowerCase().includes('pcn') || 
      c.item.toLowerCase().includes('cac') ||
      c.item.toLowerCase().includes('certificate') ||
      c.item.toLowerCase().includes('registration')
    ),
    approval: compliance.checklist.filter(c => 
      c.item.toLowerCase().includes('admin') || 
      c.item.toLowerCase().includes('approval')
    ),
  };

  const completedCount = compliance.checklist.filter(c => c.status === 'complete').length;
  const pendingCount = compliance.checklist.filter(c => c.status === 'pending').length;
  const missingCount = compliance.checklist.filter(c => c.status === 'missing').length;

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground">
            Nigerian PCN/CAC regulatory compliance status
          </p>
        </div>
        {pharmacy.approvalMode === 'TEST' && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            TEST MODE
          </Badge>
        )}
      </div>

      {/* Alerts */}
      {!pharmacy.adminApproved && pharmacy.governanceStatus !== 'SUSPENDED' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            Your pharmacy is awaiting TeraSync admin approval. Documents are reviewed manually. 
            Approval typically takes 1-2 business days after all requirements are met and documents are submitted.
          </AlertDescription>
        </Alert>
      )}

      {pharmacy.governanceStatus === 'SUSPENDED' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Pharmacy Suspended</AlertTitle>
          <AlertDescription>
            Your pharmacy operations have been suspended. Contact support for assistance.
          </AlertDescription>
        </Alert>
      )}

      {/* Document Submission Info - show only if not yet approved */}
      {!pharmacy.adminApproved && pharmacy.governanceStatus !== 'SUSPENDED' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Document Submission</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Please email your compliance documents (pharmacy license, superintendent license, CAC certificate) to{' '}
                  <a href="mailto:compliance@terasync.ng" className="font-medium underline">
                    compliance@terasync.ng
                  </a>
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Include your pharmacy name and registration email in the subject line.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{compliance.score}%</div>
              <div className="flex-1">
                <Progress value={compliance.score} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {compliance.score >= 100 ? 'Fully Compliant' : 
                   compliance.score >= 80 ? 'Almost There' : 
                   compliance.score >= 50 ? 'In Progress' : 'Action Required'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              className={
                pharmacy.governanceStatus === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                  : pharmacy.governanceStatus === 'SUSPENDED'
                    ? 'bg-red-100 text-red-800 hover:bg-red-100'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
              }
            >
              {pharmacy.governanceStatus}
            </Badge>
            {pharmacy.adminApprovedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Since {format(new Date(pharmacy.adminApprovedAt), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {completedCount} Done
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                {pendingCount} Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {missingCount} Missing
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Requirements by Category */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personnel Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-600" />
              Personnel Requirements
            </CardTitle>
            <CardDescription>
              Pharmacy Council of Nigeria (PCN) staffing requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Superintendent */}
            <div className={`p-3 rounded-lg border-l-4 ${team.superintendent ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {team.superintendent ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Superintendent Pharmacist</p>
                    {team.superintendent ? (
                      <p className="text-sm text-muted-foreground">{team.superintendent.name}</p>
                    ) : (
                      <p className="text-sm text-red-600">Not assigned - Required for operation</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">PCN Required</Badge>
              </div>
            </div>

            {/* Staff Count */}
            <div className="p-3 rounded-lg border-l-4 border-l-green-500 bg-green-50/50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Registered Staff</p>
                  <p className="text-sm text-muted-foreground">{team.totalStaff} team member(s) on record</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premises Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-purple-600" />
              Premises Requirements
            </CardTitle>
            <CardDescription>
              Physical location and premises compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Locations */}
            <div className={`p-3 rounded-lg border-l-4 ${locations.length > 0 ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {locations.length > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Registered Locations</p>
                    {locations.length > 0 ? (
                      <p className="text-sm text-muted-foreground">{locations.length} location(s) registered</p>
                    ) : (
                      <p className="text-sm text-red-600">No locations - At least one required</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Required</Badge>
              </div>
            </div>

            {/* Location List */}
            {locations.length > 0 && (
              <div className="pl-8 space-y-2">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{location.name}</span>
                    </div>
                    <Badge variant={location.isActive ? 'default' : 'secondary'} className="text-xs">
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration & Licensing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-5 w-5 text-orange-600" />
              Registration & Licensing
            </CardTitle>
            <CardDescription>
              Regulatory body registrations and admin verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* PCN Registration */}
            <div className={`p-3 rounded-lg border-l-4 ${adminVerification?.pcnLicense?.verified ? 'border-l-green-500 bg-green-50/50' : licenses.pcnRegistrationNumber ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {adminVerification?.pcnLicense?.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : licenses.pcnRegistrationNumber ? (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">PCN Registration</p>
                    <p className="text-sm text-muted-foreground">
                      {licenses.pcnRegistrationNumber || 'Not provided'}
                    </p>
                    {adminVerification?.pcnLicense?.verified && adminVerification.pcnLicense.verifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by admin on {format(new Date(adminVerification.pcnLicense.verifiedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={adminVerification?.pcnLicense?.verified ? 'bg-green-100 text-green-700 border-green-300' : ''}
                >
                  {adminVerification?.pcnLicense?.verified ? 'Verified' : 'PCN'}
                </Badge>
              </div>
            </div>

            {/* CAC Registration */}
            <div className={`p-3 rounded-lg border-l-4 ${adminVerification?.cacCertificate?.verified ? 'border-l-green-500 bg-green-50/50' : licenses.cacRegistrationNumber ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {adminVerification?.cacCertificate?.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : licenses.cacRegistrationNumber ? (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">CAC Registration</p>
                    <p className="text-sm text-muted-foreground">
                      {licenses.cacRegistrationNumber || 'Not provided'}
                    </p>
                    {licenses.cacBusinessName && (
                      <p className="text-xs text-muted-foreground">{licenses.cacBusinessName}</p>
                    )}
                    {adminVerification?.cacCertificate?.verified && adminVerification.cacCertificate.verifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by admin on {format(new Date(adminVerification.cacCertificate.verifiedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={adminVerification?.cacCertificate?.verified ? 'bg-green-100 text-green-700 border-green-300' : ''}
                >
                  {adminVerification?.cacCertificate?.verified ? 'Verified' : 'CAC'}
                </Badge>
              </div>
            </div>

            {/* Superintendent License */}
            <div className={`p-3 rounded-lg border-l-4 ${adminVerification?.superintendentLicense?.verified ? 'border-l-green-500 bg-green-50/50' : team.superintendent ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {adminVerification?.superintendentLicense?.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : team.superintendent ? (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Superintendent License</p>
                    <p className="text-sm text-muted-foreground">
                      {team.superintendent ? team.superintendent.name : 'No superintendent assigned'}
                    </p>
                    {adminVerification?.superintendentLicense?.verified && adminVerification.superintendentLicense.verifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by admin on {format(new Date(adminVerification.superintendentLicense.verifiedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={adminVerification?.superintendentLicense?.verified ? 'bg-green-100 text-green-700 border-green-300' : ''}
                >
                  {adminVerification?.superintendentLicense?.verified ? 'Verified' : 'Required'}
                </Badge>
              </div>
            </div>

            {/* Premises License */}
            <div className={`p-3 rounded-lg border-l-4 ${adminVerification?.premisesLicense?.verified ? 'border-l-green-500 bg-green-50/50' : licenses.licenseNumber ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {adminVerification?.premisesLicense?.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : licenses.licenseNumber ? (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Premises License</p>
                    <p className="text-sm text-muted-foreground">
                      {licenses.licenseNumber || 'Not provided'}
                    </p>
                    {adminVerification?.premisesLicense?.verified && adminVerification.premisesLicense.verifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by admin on {format(new Date(adminVerification.premisesLicense.verifiedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={adminVerification?.premisesLicense?.verified ? 'bg-green-100 text-green-700 border-green-300' : ''}
                >
                  {adminVerification?.premisesLicense?.verified ? 'Verified' : 'PCN'}
                </Badge>
              </div>
            </div>

            {/* NAFDAC License */}
            <div className={`p-3 rounded-lg border-l-4 ${adminVerification?.nafdacLicense?.verified ? 'border-l-green-500 bg-green-50/50' : licenses.nafdacLicenseNo ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {adminVerification?.nafdacLicense?.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : licenses.nafdacLicenseNo ? (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">NAFDAC License</p>
                    <p className="text-sm text-muted-foreground">
                      {licenses.nafdacLicenseNo || 'Not provided'}
                    </p>
                    {adminVerification?.nafdacLicense?.verified && adminVerification.nafdacLicense.verifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by admin on {format(new Date(adminVerification.nafdacLicense.verifiedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={adminVerification?.nafdacLicense?.verified ? 'bg-green-100 text-green-700 border-green-300' : ''}
                >
                  {adminVerification?.nafdacLicense?.verified ? 'Verified' : 'Optional'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5 text-green-600" />
              Platform Approval
            </CardTitle>
            <CardDescription>
              TeraSync verification and operational status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Admin Approval */}
            <div className={`p-3 rounded-lg border-l-4 ${pharmacy.adminApproved ? 'border-l-green-500 bg-green-50/50' : 'border-l-yellow-500 bg-yellow-50/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {pharmacy.adminApproved ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Admin Verification</p>
                    {pharmacy.adminApproved ? (
                      <p className="text-sm text-muted-foreground">
                        Approved {pharmacy.adminApprovedAt ? format(new Date(pharmacy.adminApprovedAt), 'MMM d, yyyy') : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-600">Awaiting review</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Required</Badge>
              </div>
            </div>

            {/* Operational Status */}
            <div className={`p-3 rounded-lg border-l-4 ${pharmacy.governanceStatus === 'ACTIVE' ? 'border-l-green-500 bg-green-50/50' : 'border-l-yellow-500 bg-yellow-50/50'}`}>
              <div className="flex items-start gap-3">
                {pharmacy.governanceStatus === 'ACTIVE' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">Operational Status</p>
                  <p className="text-sm text-muted-foreground">
                    {pharmacy.governanceStatus === 'ACTIVE' 
                      ? 'Pharmacy is fully operational'
                      : pharmacy.governanceStatus === 'SUSPENDED'
                        ? 'Operations suspended'
                        : 'Complete requirements to activate'}
                  </p>
                </div>
              </div>
            </div>

            {/* What's needed summary */}
            {pharmacy.governanceStatus !== 'ACTIVE' && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">To activate your pharmacy:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {!team.superintendent && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Assign a Superintendent Pharmacist
                    </li>
                  )}
                  {locations.length === 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Register at least one location
                    </li>
                  )}
                  {!pharmacy.adminApproved && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                      Await admin approval
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </RoleGuard>
  );
}
