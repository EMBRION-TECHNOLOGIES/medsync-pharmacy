'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Users,
  Package,
  MapPin,
  DollarSign,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PharmacyListItem {
  id: string;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  governanceStatus: string;
  approvalMode: string;
  isActive: boolean;
  adminApproved: boolean;
  adminApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
  staffCount: number;
  orderCount: number;
  locationCount: number;
  totalRevenue: number;
  paidOrderCount: number;
  superintendent: { name: string } | null;
  primaryLocation: { id: string; name: string; isPrimary: boolean } | null;
}

interface PharmaciesResponse {
  pharmacies: PharmacyListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PharmaciesListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalModeFilter, setApprovalModeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery<PharmaciesResponse>({
    queryKey: ['admin', 'pharmacies', search, statusFilter, approvalModeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (approvalModeFilter !== 'all') params.append('approvalMode', approvalModeFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/pharmacy-management?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/pharmacy-management/export/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pharmacies-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleViewPharmacy = (pharmacyId: string) => {
    router.push(`/admin/pharmacies/${pharmacyId}`);
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              All Pharmacies
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete list of all registered pharmacies on the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, CAC, PCN..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={approvalModeFilter}
                onValueChange={(value) => {
                  setApprovalModeFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="TEST">Test/Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pharmacies
              {data?.pagination && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.pagination.total} total)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Click on any pharmacy to view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to load pharmacies
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">
                        <Users className="h-4 w-4 inline mr-1" />
                        Staff
                      </TableHead>
                      <TableHead className="text-center">
                        <Package className="h-4 w-4 inline mr-1" />
                        Orders
                      </TableHead>
                      <TableHead className="text-center">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Locations
                      </TableHead>
                      <TableHead className="text-right">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Revenue
                      </TableHead>
                      <TableHead>Superintendent</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.pharmacies && data.pharmacies.length > 0 ? (
                      data.pharmacies.map((pharmacy) => (
                        <TableRow
                          key={pharmacy.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewPharmacy(pharmacy.id)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {pharmacy.displayName || pharmacy.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {pharmacy.email}
                              </div>
                              {pharmacy.city && (
                                <div className="text-xs text-muted-foreground">
                                  {pharmacy.city}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                className={statusColors[pharmacy.governanceStatus] || 'bg-gray-100 text-gray-800'}
                              >
                                {pharmacy.governanceStatus}
                              </Badge>
                              {pharmacy.approvalMode === 'TEST' && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  TEST
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {pharmacy.staffCount}
                          </TableCell>
                          <TableCell className="text-center">
                            {pharmacy.orderCount}
                            {pharmacy.paidOrderCount > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({pharmacy.paidOrderCount} paid)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pharmacy.locationCount}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(pharmacy.totalRevenue)}
                          </TableCell>
                          <TableCell>
                            {pharmacy.superintendent ? (
                              <span className="text-sm">{pharmacy.superintendent.name}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Not assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(pharmacy.createdAt), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPharmacy(pharmacy.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          No pharmacies found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data?.pagination && data.pagination.total > limit && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {page * limit + 1} to{' '}
                      {Math.min((page + 1) * limit, data.pagination.total)} of{' '}
                      {data.pagination.total} pharmacies
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data.pagination.hasMore}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
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
