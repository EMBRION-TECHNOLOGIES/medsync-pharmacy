'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks';
import {
  useAdminPharmacies,
  usePharmacyVerificationEvents,
  useUpdatePharmacyVerification,
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
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_LIMIT = 10;
const verificationEmail = 'admin@medsync.ng';

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
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All statuses' },
];

export default function PharmacyVerificationPage() {
  const { user } = useAuth();
  const authUser = user as AuthUser | undefined;
  const isAdmin = authUser?.role === 'ADMIN';
  
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

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

  const list = data as AdminPharmacyListResponse | undefined;
  const total = list?.pagination.total ?? 0;
  const hasMore = list?.pagination.hasMore ?? false;
  const records = list?.data ?? [];

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(0);
  };

  const handleResetFilters = () => {
    setStatusFilter('pending');
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
    nextStatus: 'approved' | 'rejected'
  ) => {
    let notes: string | undefined;

    if (nextStatus === 'rejected') {
      notes = window.prompt('Add rejection notes (optional)') || undefined;
    }

    toast.promise(
      updateStatus.mutateAsync({ pharmacyId, status: nextStatus, notes }),
      {
        loading: 'Updating verification status…',
        success: 'Verification status updated.',
        error: 'Failed to update verification status.',
      }
    );
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
                  <TableHead className="w-40 text-right">Actions</TableHead>
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
                          <span className="font-medium">{pharmacy.displayName || pharmacy.name}</span>
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
                            onClick={() => handleUpdateStatus(pharmacy.id, 'approved')}
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
    </div>
    </RoleGuard>
  );
}


