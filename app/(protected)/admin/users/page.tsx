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
  Users,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
  Package,
  MessageSquare,
  Building2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  medSyncId: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  location: string | null;
  hasProfileImage: boolean;
  createdAt: string;
  orderCount: number;
  messageCount: number;
  paymentCount: number;
  pharmacyUser: {
    roleType: string;
    pharmacy: {
      id: string;
      name: string;
    };
  } | null;
}

interface UsersResponse {
  users: UserListItem[];
  filters: {
    roles: Array<{ role: string; count: number }>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  USER: 'bg-blue-100 text-blue-800',
  PATIENT: 'bg-sky-100 text-sky-800',
  PHARMACY_OWNER: 'bg-green-100 text-green-800',
  SUPERINTENDENT_PHARMACIST: 'bg-amber-100 text-amber-800',
  SUPERVISING_PHARMACIST: 'bg-orange-100 text-orange-800',
  STAFF: 'bg-gray-100 text-gray-800',
};

// Role filter options with clear categories
const roleFilterOptions = [
  { value: 'all', label: 'All Roles', group: 'all' },
  { value: 'ADMIN', label: 'Admin', group: 'system' },
  { value: 'PATIENT', label: 'Patient', group: 'system' },
  { value: 'PHARMACY_OWNER', label: 'Pharmacy Owner', group: 'pharmacy' },
  { value: 'SUPERINTENDENT_PHARMACIST', label: 'Superintendent', group: 'pharmacy' },
  { value: 'SUPERVISING_PHARMACIST', label: 'Supervisor', group: 'pharmacy' },
  { value: 'STAFF', label: 'Staff', group: 'pharmacy' },
];

// Helper to get display label for role
function getRoleLabel(user: UserListItem): string {
  // If user has a pharmacy role, show that instead of system role
  if (user.pharmacyUser?.roleType) {
    switch (user.pharmacyUser.roleType) {
      case 'PHARMACY_OWNER': return 'Owner';
      case 'SUPERINTENDENT_PHARMACIST': return 'Superintendent';
      case 'SUPERVISING_PHARMACIST': return 'Supervisor';
      case 'STAFF': return 'Staff';
      default: return user.pharmacyUser.roleType;
    }
  }
  // For users without pharmacy association
  if (user.role === 'USER') return 'Patient';
  if (user.role === 'ADMIN') return 'Admin';
  return user.role || 'User';
}

// Helper to get role color
function getRoleColor(user: UserListItem): string {
  if (user.pharmacyUser?.roleType) {
    return roleColors[user.pharmacyUser.roleType] || 'bg-gray-100 text-gray-800';
  }
  if (user.role === 'USER') return roleColors.PATIENT;
  return roleColors[user.role] || 'bg-gray-100 text-gray-800';
}

export default function UsersListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', search, roleFilter, activeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      // Handle role filter - pharmacy roles go to pharmacyRoleType, system roles go to role
      if (roleFilter !== 'all') {
        const pharmacyRoles = ['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST', 'STAFF'];
        if (pharmacyRoles.includes(roleFilter)) {
          params.append('pharmacyRoleType', roleFilter);
        } else {
          params.append('role', roleFilter);
        }
      }
      
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/user-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/user-oversight/export/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleViewUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              All Users
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete list of all registered users on the platform
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
                    placeholder="Search by name, email, MedSync ID, phone..."
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
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PATIENT">Patient</SelectItem>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Pharmacy Staff
                  </div>
                  <SelectItem value="PHARMACY_OWNER">Owner</SelectItem>
                  <SelectItem value="SUPERINTENDENT_PHARMACIST">Superintendent</SelectItem>
                  <SelectItem value="SUPERVISING_PHARMACIST">Supervisor</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={activeFilter}
                onValueChange={(value) => {
                  setActiveFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users
              {data?.pagination && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.pagination.total} total)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Click on any user to view detailed information
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
                Failed to load users
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">
                        <Package className="h-4 w-4 inline mr-1" />
                        Orders
                      </TableHead>
                      <TableHead className="text-center">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        Messages
                      </TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users && data.users.length > 0 ? (
                      data.users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewUser(user.id)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.email || 'No email'}
                              </div>
                              {user.medSyncId && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {user.medSyncId}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user)}>
                              {getRoleLabel(user)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.isActive ? (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                              <span title={user.emailVerified ? "Email verified" : "Email not verified"}>
                                {user.emailVerified ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.orderCount}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.messageCount}
                          </TableCell>
                          <TableCell>
                            {user.pharmacyUser ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[150px]">
                                  {user.pharmacyUser.pharmacy.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewUser(user.id);
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
                          No users found
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
                      {data.pagination.total} users
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
