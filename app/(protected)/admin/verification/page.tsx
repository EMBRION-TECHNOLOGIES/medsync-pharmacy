'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks';
import {
  useAdminPharmacies,
  usePharmacyVerificationEvents,
  useUpdatePharmacyVerification,
  useSetTestMode,
  useUpdateComplianceItem,
} from '@/features/admin/pharmacyVerification/hooks';
import { AdminPharmacyRecord, AdminPharmacyListResponse } from '@/features/admin/pharmacyVerification/service';
import { AuthUser } from '@/lib/zod-schemas';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  History,
  ArrowLeft,
  ArrowRight,
  Search,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DEFAULT_LIMIT = 10;
const verificationEmail = 'admin@terasync.ng';

const statusMeta = {
  approved: {
    label: 'Approved',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/40',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: <Clock className="h-3 w-3" />,
  },
} as const;

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function PharmacyVerificationPage() {
  const { user } = useAuth();
  const authUser = user as AuthUser | undefined;
  const isAdmin = authUser?.role === 'ADMIN';
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingPharmacyId, setRejectingPharmacyId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  
  // Approval dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvingPharmacy, setApprovingPharmacy] = useState<AdminPharmacyRecord | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const queryParams = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: appliedSearch || undefined,
      limit: DEFAULT_LIMIT,
      offset: page * DEFAULT_LIMIT,
    }),
    [statusFilter, appliedSearch, page]
  );

  // Only enable hooks if user is admin
  const { data, isLoading, isFetching } = useAdminPharmacies(queryParams, { enabled: isAdmin });
  const eventsQuery = usePharmacyVerificationEvents(selectedPharmacyId || undefined, { enabled: isAdmin && !!selectedPharmacyId });
  const updateStatus = useUpdatePharmacyVerification();
  const setTestMode = useSetTestMode();
  const updateComplianceItem = useUpdateComplianceItem();

  const list = data as AdminPharmacyListResponse | undefined;
  const total = list?.pagination?.total ?? 0;
  const hasMore = list?.pagination?.hasMore ?? false;
  const records = list?.data ?? [];

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(0);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchInput('');
    setAppliedSearch('');
    setPage(0);
  };

  const renderStatusBadge = (status: string) => {
    const normalized = (status || 'pending').toLowerCase();
    const validStatuses: Array<keyof typeof statusMeta> = ['approved', 'rejected', 'pending'];
    const normalizedKey = validStatuses.includes(normalized as keyof typeof statusMeta) 
      ? (normalized as keyof typeof statusMeta)
      : 'pending';
    const meta = statusMeta[normalizedKey];
    return (
      <Badge variant="outline" className={meta.className}>
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  const handleUpdateStatus = async (
    pharmacyId: string,
    nextStatus: 'approved' | 'rejected',
    pharmacy?: AdminPharmacyRecord
  ) => {
    if (nextStatus === 'rejected') {
      setRejectingPharmacyId(pharmacyId);
      setRejectionNotes('');
      setShowRejectDialog(true);
      return;
    }

    // For approval, show confirmation dialog with checklist
    if (pharmacy) {
      setApprovingPharmacy(pharmacy);
      setApprovalNotes('');
      setShowApproveDialog(true);
    }
  };

  const handleToggleComplianceItem = async (item: string, currentValue: boolean) => {
    if (!approvingPharmacy) return;
    
    // Optimistically update UI
    const newValue = !currentValue;
    setApprovingPharmacy(prev => {
      if (!prev) return null;
      return {
        ...prev,
        adminVerification: {
          ...prev.adminVerification,
          [item]: {
            verified: newValue,
            verifiedAt: newValue ? new Date().toISOString() : null,
          },
        } as typeof prev.adminVerification,
      };
    });

    updateComplianceItem.mutate(
      { pharmacyId: approvingPharmacy.id, item, verified: newValue },
      {
        onSuccess: (response: any) => {
          // Update with server response if available
          const adminVerification = response?.data?.adminVerification || response?.adminVerification;
          if (adminVerification) {
            setApprovingPharmacy(prev => prev ? {
              ...prev,
              adminVerification,
            } : null);
          }
          toast.success(`${item.replace(/([A-Z])/g, ' $1').trim()} ${newValue ? 'verified' : 'unverified'}`);
        },
        onError: () => {
          // Revert optimistic update on error
          setApprovingPharmacy(prev => {
            if (!prev) return null;
            return {
              ...prev,
              adminVerification: {
                ...prev.adminVerification,
                [item]: {
                  verified: currentValue,
                  verifiedAt: currentValue ? prev.adminVerification?.[item as keyof typeof prev.adminVerification]?.verifiedAt : null,
                },
              } as typeof prev.adminVerification,
            };
          });
          toast.error('Failed to update verification status');
        },
      }
    );
  };

  const handleConfirmApprove = () => {
    if (!approvingPharmacy) return;

    // Build review summary from persisted verification items
    const checkedItems = [];
    const av = approvingPharmacy.adminVerification;
    if (av?.pcnLicense?.verified) checkedItems.push('PCN license verified');
    if (av?.superintendentLicense?.verified) checkedItems.push('Superintendent license verified');
    if (av?.cacCertificate?.verified) checkedItems.push('CAC certificate verified');
    if (av?.premisesLicense?.verified) checkedItems.push('Premises license verified');
    if (av?.namesMatch?.verified) checkedItems.push('Names verified');

    const reviewSummary = checkedItems.length > 0 
      ? `Verified: ${checkedItems.join(', ')}. ${approvalNotes}`.trim()
      : approvalNotes.trim() || undefined;

    setShowApproveDialog(false);
    toast.promise(
      updateStatus.mutateAsync({ 
        pharmacyId: approvingPharmacy.id, 
        status: 'approved', 
        notes: reviewSummary 
      }),
      {
        loading: 'Approving pharmacy…',
        success: 'Pharmacy approved and activated.',
        error: (err) => err?.response?.data?.error || 'Failed to approve pharmacy. Check requirements.',
      }
    );

    setApprovingPharmacy(null);
    setApprovalNotes('');
  };

  const handleConfirmReject = () => {
    if (!rejectingPharmacyId) return;

    setShowRejectDialog(false);
    toast.promise(
      updateStatus.mutateAsync({
        pharmacyId: rejectingPharmacyId,
        status: 'rejected',
        notes: rejectionNotes.trim() || undefined,
      }),
      {
        loading: 'Rejecting pharmacy…',
        success: 'Pharmacy rejected.',
        error: 'Failed to reject pharmacy.',
      }
    );

    setRejectingPharmacyId(null);
    setRejectionNotes('');
  };

  const handleToggleTestMode = (pharmacy: AdminPharmacyRecord) => {
    const isTest = pharmacy.approvalMode === 'TEST';
    if (confirm(isTest 
      ? 'Disable test mode? Pharmacy will need to meet all requirements to operate.'
      : 'Enable test mode? This allows the pharmacy to operate without full document verification. Use for testing only.'
    )) {
      toast.promise(
        setTestMode.mutateAsync({ 
          pharmacyId: pharmacy.id, 
          enabled: !isTest 
        }),
        {
          loading: isTest ? 'Disabling test mode...' : 'Enabling test mode...',
          success: isTest ? 'Test mode disabled' : 'Test mode enabled',
          error: 'Failed to update test mode',
        }
      );
    }
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Pharmacy Verification</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You need admin access to review pharmacy verification requests.
          </CardContent>
        </Card>
      </div>
    }>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy Verification</h1>
          <p className="text-muted-foreground">
            Review new pharmacy registrations, document submissions, and manual approvals.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Incoming Requests</CardTitle>
            <CardDescription>
              Verify pharmacy licenses and supervising pharmacist identities before unlocking order access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <form
                onSubmit={handleSearchSubmit}
                className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by pharmacy, owner email, or license…"
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="default">
                    Search
                  </Button>
                  <Button type="button" variant="outline" onClick={handleResetFilters}>
                    Reset
                  </Button>
                </div>
              </form>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center">
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading verification requests…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : records.length > 0 ? (
                    records.map((pharmacy: AdminPharmacyRecord) => (
                      <TableRow key={pharmacy.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{pharmacy.displayName || pharmacy.name}</span>
                              {pharmacy.approvalMode === 'TEST' && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                  <FlaskConical className="h-3 w-3 mr-1" />
                                  TEST
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{pharmacy.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pharmacy.owner ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {pharmacy.owner.firstName} {pharmacy.owner.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {pharmacy.owner.email || pharmacy.owner.phone}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{renderStatusBadge(pharmacy.verificationStatus)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {pharmacy.createdAt ? new Date(pharmacy.createdAt).toLocaleString() : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedPharmacyId((current) =>
                                  current === pharmacy.id ? null : pharmacy.id
                                )
                              }
                            >
                              <History className="mr-2 h-4 w-4" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(pharmacy.id, 'approved', pharmacy)}
                              disabled={isFetching || updateStatus.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUpdateStatus(pharmacy.id, 'rejected')}
                              disabled={isFetching || updateStatus.isPending}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleTestMode(pharmacy)}
                              disabled={isFetching || setTestMode.isPending}
                              className={pharmacy.approvalMode === 'TEST' ? 'border-purple-300 text-purple-700' : ''}
                              title={pharmacy.approvalMode === 'TEST' ? 'Disable test mode' : 'Enable test mode'}
                            >
                              <FlaskConical className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No pharmacies match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing {Math.min(total, page * DEFAULT_LIMIT + 1)}–
                {Math.min(total, (page + 1) * DEFAULT_LIMIT)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={page === 0 || isFetching}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={!hasMore || isFetching}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedPharmacyId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Verification History
              </CardTitle>
              <CardDescription>
                Notes and status changes for this pharmacy application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history…
                </div>
              ) : eventsQuery.data && eventsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {eventsQuery.data.map((event) => {
                    const eventStatus = (event.status || 'pending').toLowerCase();
                    const validStatuses: Array<keyof typeof statusMeta> = ['approved', 'rejected', 'pending'];
                    const normalizedKey = validStatuses.includes(eventStatus as keyof typeof statusMeta)
                      ? (eventStatus as keyof typeof statusMeta)
                      : 'pending';
                    const meta = statusMeta[normalizedKey];
                    return (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border bg-muted/40 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={meta.className}>
                            {meta.icon}
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {event.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{event.notes}</p>
                        )}
                        {event.createdBy && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reviewed by {event.createdBy.firstName} {event.createdBy.lastName} (
                            {event.createdBy.email})
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
                  No verification events recorded yet. Ensure pharmacies email documentation to{' '}
                  <a className="font-medium underline" href={`mailto:${verificationEmail}`}>
                    {verificationEmail}
                  </a>
                  .
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rejection Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Pharmacy</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this pharmacy application. This will be sent to the pharmacy owner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="rejection-notes" className="text-sm font-medium">
                  Rejection Notes
                </label>
                <Textarea
                  id="rejection-notes"
                  placeholder="Enter reason for rejection (optional)..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectingPharmacyId(null);
                  setRejectionNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmReject}
              >
                Reject Pharmacy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog with Checklist */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Approve Pharmacy</DialogTitle>
              <DialogDescription>
                Review requirements for <span className="font-medium">{approvingPharmacy?.displayName || approvingPharmacy?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* System Requirements - Auto-checked from database */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  System Requirements
                  <span className="text-muted-foreground font-normal ml-2">(auto-verified)</span>
                </label>
                <div className="space-y-2 rounded-lg border p-3">
                  {/* Superintendent */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      {approvingPharmacy?.governance?.hasSuperintendent ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Superintendent Pharmacist</span>
                    </div>
                    <Badge variant={approvingPharmacy?.governance?.hasSuperintendent ? 'default' : 'destructive'} className="text-xs">
                      {approvingPharmacy?.governance?.hasSuperintendent 
                        ? `${approvingPharmacy.governance.superintendentCount} assigned` 
                        : 'Missing'}
                    </Badge>
                  </div>

                  {/* Locations */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      {approvingPharmacy?.governance?.hasLocations ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Registered Location(s)</span>
                    </div>
                    <Badge variant={approvingPharmacy?.governance?.hasLocations ? 'default' : 'destructive'} className="text-xs">
                      {approvingPharmacy?.governance?.hasLocations 
                        ? `${approvingPharmacy.governance.locationCount} location(s)` 
                        : 'Missing'}
                    </Badge>
                  </div>

                  {/* Team */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">Team Members</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {approvingPharmacy?.governance?.teamCount || 0} staff
                    </Badge>
                  </div>

                  {/* Location warnings */}
                  {approvingPharmacy?.governance?.hasLocationWarnings && (
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-700">Locations without supervisor</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        {approvingPharmacy.governance.locationsWithoutSupervisor} location(s)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* License Information - From database */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  License Information
                  <span className="text-muted-foreground font-normal ml-2">(entered by pharmacy)</span>
                </label>
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">PCN Registration</p>
                    <p className="font-medium">{approvingPharmacy?.licenses?.pcnRegistrationNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">CAC Registration</p>
                    <p className="font-medium">{approvingPharmacy?.licenses?.cacRegistrationNumber || '—'}</p>
                    {approvingPharmacy?.licenses?.cacBusinessName && (
                      <p className="text-xs text-muted-foreground">{approvingPharmacy.licenses.cacBusinessName}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Premises License</p>
                    <p className="font-medium">{approvingPharmacy?.licenses?.premisesLicense || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">NAFDAC License</p>
                    <p className="font-medium">{approvingPharmacy?.licenses?.nafdacLicenseNo || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Document Verification - Persisted toggles */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Document Verification
                  <span className="text-muted-foreground font-normal ml-2">(changes save immediately)</span>
                </label>
                <div className="space-y-2 rounded-lg border p-3">
                  {/* PCN License */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.pcnLicense?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">PCN License</p>
                        {approvingPharmacy?.adminVerification?.pcnLicense?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.pcnLicense.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.pcnLicense?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('pcnLicense', approvingPharmacy?.adminVerification?.pcnLicense?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>

                  {/* Superintendent License */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.superintendentLicense?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Superintendent License</p>
                        {approvingPharmacy?.adminVerification?.superintendentLicense?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.superintendentLicense.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.superintendentLicense?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('superintendentLicense', approvingPharmacy?.adminVerification?.superintendentLicense?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>

                  {/* CAC Certificate */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.cacCertificate?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">CAC Certificate</p>
                        {approvingPharmacy?.adminVerification?.cacCertificate?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.cacCertificate.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.cacCertificate?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('cacCertificate', approvingPharmacy?.adminVerification?.cacCertificate?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>

                  {/* Premises License */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.premisesLicense?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Premises License</p>
                        {approvingPharmacy?.adminVerification?.premisesLicense?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.premisesLicense.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.premisesLicense?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('premisesLicense', approvingPharmacy?.adminVerification?.premisesLicense?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>

                  {/* NAFDAC License */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.nafdacLicense?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">NAFDAC License</p>
                        {approvingPharmacy?.adminVerification?.nafdacLicense?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.nafdacLicense.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.nafdacLicense?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('nafdacLicense', approvingPharmacy?.adminVerification?.nafdacLicense?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>

                  {/* Names Match */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-3">
                      {approvingPharmacy?.adminVerification?.namesMatch?.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Names Match Documents</p>
                        {approvingPharmacy?.adminVerification?.namesMatch?.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {new Date(approvingPharmacy.adminVerification.namesMatch.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={approvingPharmacy?.adminVerification?.namesMatch?.verified || false}
                      onCheckedChange={() => handleToggleComplianceItem('namesMatch', approvingPharmacy?.adminVerification?.namesMatch?.verified || false)}
                      disabled={updateComplianceItem.isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <label htmlFor="approval-notes" className="text-sm font-medium">
                  Review Notes
                  <span className="text-muted-foreground font-normal ml-2">(optional)</span>
                </label>
                <Textarea
                  id="approval-notes"
                  placeholder="e.g., Documents received via email on Jan 18, all verified"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Approval readiness */}
              {!approvingPharmacy?.governance?.canBeApproved && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800 font-medium">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Cannot approve: Missing required system requirements
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Pharmacy must have at least one superintendent and one location before approval.
                  </p>
                </div>
              )}

              {approvingPharmacy?.governance?.canBeApproved && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    This action enables live medication dispensing for this pharmacy.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowApproveDialog(false);
                  setApprovingPharmacy(null);
                  setApprovalNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmApprove}
                disabled={!approvingPharmacy?.governance?.canBeApproved}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
