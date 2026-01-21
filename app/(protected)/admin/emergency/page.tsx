'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Shield,
  Heart,
  Pill,
  CheckCircle,
  XCircle,
  Droplets,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface EmergencyUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  medSyncId: string | null;
  emergencyContact: {
    name: string;
    phone: string | null;
    relationship: string | null;
  } | null;
  emergencyVerified: boolean;
  emergencyVerifiedAt: string | null;
  emsId: string | null;
  emsIdAssignedAt: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyConditionsCount: number;
  createdAt: string;
}

interface EmergencyStats {
  overview: {
    totalPatients: number;
    withEmergencyContact: number;
    withVerifiedEmergency: number;
    withEmsId: number;
    emergencyConditions: number;
    emergencyContactRate: number;
    verificationRate: number;
  };
}

export default function EmergencyOversightPage() {
  const [search, setSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<EmergencyUser | null>(null);
  const limit = 20;

  const { data: stats } = useQuery<EmergencyStats>({
    queryKey: ['admin', 'emergency-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/emergency-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'emergency-oversight', search, contactFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (contactFilter !== 'all') params.append('hasEmergencyContact', contactFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/emergency-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'emergency-oversight', selectedUser?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/emergency-oversight/${selectedUser?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedUser?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Emergency Info Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor patient emergency contacts and medical info
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.overview?.totalPatients || 0}</div>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.overview?.withEmergencyContact || 0}</div>
              <p className="text-sm text-muted-foreground">With Emergency Contact</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.overview?.emergencyContactRate || 0}%</div>
              <p className="text-sm text-muted-foreground">Contact Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats?.overview?.withEmsId || 0}</div>
              <p className="text-sm text-muted-foreground">With EMS ID</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{stats?.overview?.emergencyConditions || 0}</div>
              <p className="text-sm text-muted-foreground">Emergency Conditions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or contact..."
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
                value={contactFilter}
                onValueChange={(value) => {
                  setContactFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Emergency Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="true">With Contact</SelectItem>
                  <SelectItem value="false">Without Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Emergency Info</CardTitle>
            <CardDescription>Click to view full details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to load emergency info
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Emergency Contact</TableHead>
                      <TableHead>Blood Type</TableHead>
                      <TableHead>EMS ID</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users && data.users.length > 0 ? (
                      data.users.map((user: EmergencyUser) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.emergencyContact ? (
                              <div>
                                <div className="text-sm">{user.emergencyContact.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {user.emergencyContact.relationship}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.bloodType ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Droplets className="h-3 w-3" />
                                {user.bloodType}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.emsId ? (
                              <Badge variant="secondary" className="font-mono">
                                {user.emsId}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.emergencyConditionsCount > 0 ? (
                              <Badge variant="destructive">{user.emergencyConditionsCount}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.emergencyVerified ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No patients found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data?.pagination && data.pagination.total > limit && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.pagination.total)} of {data.pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data.pagination.hasMore}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Profile
              </DialogTitle>
              <DialogDescription>
                {userDetail?.name || selectedUser?.name}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : userDetail ? (
              <div className="space-y-6">
                {/* Patient Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> {userDetail.name}</div>
                      <div className="col-span-2 break-words"><span className="text-muted-foreground">Email:</span> {userDetail.email}</div>
                      {userDetail.phone && <div><span className="text-muted-foreground">Phone:</span> {userDetail.phone}</div>}
                      {userDetail.medSyncId && <div><span className="text-muted-foreground">MedSync ID:</span> {userDetail.medSyncId}</div>}
                      {userDetail.dateOfBirth && <div><span className="text-muted-foreground">DOB:</span> {format(new Date(userDetail.dateOfBirth), 'MMM d, yyyy')}</div>}
                      {userDetail.gender && <div><span className="text-muted-foreground">Gender:</span> {userDetail.gender}</div>}
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card className={userDetail.emergencyContact ? 'border-emerald-200' : 'border-amber-200'}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Emergency Contact
                      {userDetail.emergencyVerified && (
                        <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800">Verified</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {userDetail.emergencyContact ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {userDetail.emergencyContact.name}</div>
                        <div><span className="text-muted-foreground">Phone:</span> {userDetail.emergencyContact.phone || 'N/A'}</div>
                        <div><span className="text-muted-foreground">Relationship:</span> {userDetail.emergencyContact.relationship || 'N/A'}</div>
                        {userDetail.emergencyVerifiedAt && (
                          <div><span className="text-muted-foreground">Verified:</span> {format(new Date(userDetail.emergencyVerifiedAt), 'MMM d, yyyy')}</div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600">No emergency contact set</p>
                    )}
                  </CardContent>
                </Card>

                {/* Medical Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Medical Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Blood Type:</span>
                        {userDetail.bloodType ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            {userDetail.bloodType}
                          </Badge>
                        ) : (
                          'Not set'
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">EMS ID:</span>{' '}
                        {userDetail.emsId ? (
                          <Badge variant="secondary" className="font-mono">{userDetail.emsId}</Badge>
                        ) : (
                          'Not assigned'
                        )}
                      </div>
                    </div>
                    {userDetail.allergies && (
                      <div className="mt-3">
                        <span className="text-sm text-muted-foreground">Allergies:</span>
                        <p className="text-sm mt-1 p-2 bg-red-50 text-red-800 rounded">{userDetail.allergies}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Emergency Conditions */}
                {userDetail.emergencyConditions && userDetail.emergencyConditions.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        Emergency Conditions ({userDetail.emergencyConditions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2">
                        {userDetail.emergencyConditions.map((condition: any) => (
                          <div key={condition.id} className="p-2 bg-red-50 rounded text-sm">
                            <div className="font-medium text-red-800">{condition.name}</div>
                            <div className="text-xs text-red-600">
                              {condition.severity && `Severity: ${condition.severity}`}
                              {condition.isChronic && ' • Chronic'}
                            </div>
                            {condition.notes && <p className="text-xs mt-1">{condition.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Active Medications */}
                {userDetail.activeMedications && userDetail.activeMedications.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Active Medications ({userDetail.activeMedications.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2">
                        {userDetail.activeMedications.map((med: any) => (
                          <div key={med.id} className="p-2 bg-muted/50 rounded text-sm">
                            <div className="font-medium">{med.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {med.dosage} • {med.frequency}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insurance */}
                {userDetail.insurance && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Insurance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Provider:</span> {userDetail.insurance.provider}</div>
                        <div><span className="text-muted-foreground">Number:</span> {userDetail.insurance.number}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
