'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks';
import {
  useAdminPharmacies,
} from '@/features/admin/pharmacyVerification/hooks';
import { useQueryClient } from '@tanstack/react-query';
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
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

const DEFAULT_LIMIT = 20;

const governanceStatusMeta = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-destructive/10 text-destructive border-destructive/40',
    icon: <XCircle className="h-3 w-3" />,
  },
  INCOMPLETE: {
    label: 'Incomplete',
    className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
} as const;

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminGovernancePage() {
  const { user } = useAuth();
  const authUser = user as AuthUser | undefined;
  const isAdmin = authUser?.role === 'ADMIN';
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [suspendingPharmacyId, setSuspendingPharmacyId] = useState<string | null>(null);

  // Fetch pharmacies - we'll need to get governance status from backend
  const { data, isLoading, error, refetch } = useAdminPharmacies({
    status: statusFilter === 'all' ? undefined : statusFilter.toLowerCase(),
    search: appliedSearch || undefined,
    limit: DEFAULT_LIMIT,
    offset: page * DEFAULT_LIMIT,
  }, { enabled: true });

  // Fix: The service returns { data: PharmacyRecord[], pagination: {...} }
  const pharmacies = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / DEFAULT_LIMIT);

  // Debug logging
  console.log('🔍 Governance Page Debug:', {
    hasData: !!data,
    pharmaciesCount: pharmacies.length,
    total,
    isLoading,
    error: error?.message,
    rawData: data,
  });

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(0);
  };

  const handleSuspendPharmacy = async (pharmacyId: string) => {
    if (!confirm('Are you sure you want to suspend this pharmacy? They will not be able to operate until reactivated.')) {
      return;
    }

    setSuspendingPharmacyId(pharmacyId);
    try {
      // Update governance status to SUSPENDED
      await api.patch(`/admin/pharmacies/${pharmacyId}/governance-status`, {
        status: 'SUSPENDED',
        notes: 'Suspended by admin via governance dashboard',
      });

      toast.success('Pharmacy suspended successfully');
      // Invalidate all pharmacy queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'pharmacies'] });
      await refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to suspend pharmacy';
      toast.error(errorMessage);
    } finally {
      setSuspendingPharmacyId(null);
    }
  };

  const handleActivatePharmacy = async (pharmacyId: string) => {
    if (!confirm('Are you sure you want to activate this pharmacy? They will be able to operate immediately.')) {
      return;
    }

    setSuspendingPharmacyId(pharmacyId);
    try {
      // Update governance status to ACTIVE (if requirements are met)
      await api.patch(`/admin/pharmacies/${pharmacyId}/governance-status`, {
        status: 'ACTIVE',
        notes: 'Activated by admin via governance dashboard',
      });

      toast.success('Pharmacy activated successfully');
      // Invalidate all pharmacy queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'pharmacies'] });
      await refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to activate pharmacy';
      toast.error(errorMessage);
    } finally {
      setSuspendingPharmacyId(null);
    }
  };

  // Fetch ALL pharmacies for stats (unfiltered, no pagination)
  const { data: statsData, isLoading: statsLoading } = useAdminPharmacies(
    {
      limit: 1000, // Get all for stats
      offset: 0,
    },
    { enabled: true } // Always enabled to get stats
  );

  // Calculate stats from all pharmacies (not just current page)
  // Use statsData if available, otherwise use current page data as fallback
  const stats = useMemo(() => {
    const allPharmacies = statsData?.data || pharmacies;
    const active = allPharmacies.filter(p => 
      p.governanceStatus === 'ACTIVE' || (!p.governanceStatus && p.verificationStatus === 'approved')
    ).length;
    const incomplete = allPharmacies.filter(p => 
      p.governanceStatus === 'INCOMPLETE' || (!p.governanceStatus && p.verificationStatus === 'pending')
    ).length;
    const suspended = allPharmacies.filter(p => 
      p.governanceStatus === 'SUSPENDED'
    ).length;
    return { 
      active, 
      incomplete, 
      suspended, 
      total: statsData?.pagination?.total || total || 0 
    };
  }, [statsData, pharmacies, total]);

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Governance Review</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You need admin access to review pharmacy governance.
          </CardContent>
        </Card>
      </div>
    }>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Governance Review</h1>
          <p className="text-muted-foreground">
            Monitor pharmacy compliance, governance status, and operational eligibility.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pharmacies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.incomplete}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.suspended}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search pharmacies..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pharmacies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pharmacies</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${total} pharmacy${total !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-10 text-destructive">
                Failed to load pharmacies. Please try again.
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No pharmacies found matching your criteria.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pharmacies.map((pharmacy: any) => {
                      const governanceStatus = pharmacy.governanceStatus || 
                        (pharmacy.verificationStatus === 'approved' ? 'ACTIVE' : 
                         pharmacy.verificationStatus === 'rejected' ? 'SUSPENDED' : 'INCOMPLETE');
                      const statusMeta = governanceStatusMeta[governanceStatus as keyof typeof governanceStatusMeta] || governanceStatusMeta.INCOMPLETE;
                      
                      return (
                        <TableRow key={pharmacy.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{pharmacy.name || pharmacy.displayName}</div>
                              {pharmacy.licenseNumber && (
                                <div className="text-sm text-muted-foreground">
                                  License: {pharmacy.licenseNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pharmacy.owner ? (
                              <div>
                                <div className="text-sm">{pharmacy.owner.firstName} {pharmacy.owner.lastName}</div>
                                <div className="text-xs text-muted-foreground">{pharmacy.owner.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No owner</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusMeta.className}>
                              {statusMeta.icon}
                              <span className="ml-1">{statusMeta.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              pharmacy.verificationStatus === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40'
                                : pharmacy.verificationStatus === 'rejected'
                                ? 'bg-destructive/10 text-destructive border-destructive/40'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }>
                              {pharmacy.verificationStatus === 'approved' ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {pharmacy.verificationStatus || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(pharmacy.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/verification?pharmacyId=${pharmacy.id}`}>
                                <Button variant="outline" size="sm">
                                  Review
                                </Button>
                              </Link>
                              {governanceStatus === 'SUSPENDED' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivatePharmacy(pharmacy.id)}
                                  disabled={suspendingPharmacyId === pharmacy.id}
                                >
                                  {suspendingPharmacyId === pharmacy.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Activate'
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleSuspendPharmacy(pharmacy.id)}
                                  disabled={suspendingPharmacyId === pharmacy.id}
                                >
                                  {suspendingPharmacyId === pharmacy.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Suspend'
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
