'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Pill,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  dosageForm: string | null;
  frequency: string | null;
  instructions: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  prescribedBy: string | null;
  prescriptionDate: string | null;
  doseCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface MedicationDetail {
  id: string;
  name: string;
  dosage: string | null;
  dosageForm: string | null;
  frequency: string | null;
  instructions: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  prescribedBy: string | null;
  prescriptionDate: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    medSyncId: string | null;
    memberSince: string;
  } | null;
  adherence: {
    rate: number;
    totalDoses: number;
    takenCount: number;
  };
  recentDoses: Array<{
    id: string;
    scheduledTime: string;
    takenAt: string | null;
    status: string;
    notes: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MedicationsResponse {
  medications: Medication[];
  filters: {
    activeStatus: Array<{ isActive: boolean; count: number }>;
    frequencies: Array<{ frequency: string; count: number }>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface MedicationStats {
  total: number;
  active: number;
  inactive: number;
  newThisWeek: number;
  newThisMonth: number;
  doses: {
    total: number;
    taken: number;
    missed: number;
    adherenceRate: number;
  };
  topMedications: Array<{ name: string; count: number }>;
}

export default function MedicationsOversightPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const limit = 20;

  const { data: stats, isLoading: statsLoading } = useQuery<MedicationStats>({
    queryKey: ['admin', 'medication-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/medication-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery<MedicationsResponse>({
    queryKey: ['admin', 'medication-oversight', search, activeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/medication-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: medicationDetail, isLoading: detailLoading } = useQuery<MedicationDetail>({
    queryKey: ['admin', 'medication-oversight', selectedMedication?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/medication-oversight/${selectedMedication?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedMedication?.id,
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.append('isActive', activeFilter);

      const response = await api.get(`/admin/medication-oversight/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medications-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6" />
              Medications Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all medications across the platform
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Medications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.active || 0}</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-500">{stats?.inactive || 0}</div>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.newThisWeek || 0}</div>
              <p className="text-sm text-muted-foreground">New This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600">{stats?.doses?.adherenceRate || 0}%</div>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground">Adherence Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Medications */}
        {stats?.topMedications && stats.topMedications.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Most Common Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topMedications.map((med, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {med.name} ({med.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by medication name, generic name..."
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

        {/* Medications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Medications</CardTitle>
            <CardDescription>
              Click on a medication to view details
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
                Failed to load medications
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Doses</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.medications && data.medications.length > 0 ? (
                      data.medications.map((med) => (
                        <TableRow
                          key={med.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedMedication(med)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{med.name}</div>
                              {med.dosageForm && (
                                <div className="text-xs text-muted-foreground">{med.dosageForm}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {med.user ? (
                              <div>
                                <div className="text-sm">{med.user.name}</div>
                                <div className="text-xs text-muted-foreground">{med.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>{med.dosage || '-'}</TableCell>
                          <TableCell>{med.frequency || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={med.isActive ? 'default' : 'secondary'}>
                              {med.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{med.doseCount}</TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(med.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No medications found
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

        {/* Medication Detail Dialog */}
        <Dialog open={!!selectedMedication} onOpenChange={(open) => !open && setSelectedMedication(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                {medicationDetail?.name || selectedMedication?.name}
              </DialogTitle>
              {medicationDetail?.dosageForm && (
                <DialogDescription>{medicationDetail.dosageForm}</DialogDescription>
              )}
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : medicationDetail ? (
              <div className="space-y-6">
                {/* Medication Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Dosage</h4>
                    <p className="mt-1">{medicationDetail.dosage || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Frequency</h4>
                    <p className="mt-1">{medicationDetail.frequency || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <Badge variant={medicationDetail.isActive ? 'default' : 'secondary'} className="mt-1">
                      {medicationDetail.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Prescribed By</h4>
                    <p className="mt-1">{medicationDetail.prescribedBy || '-'}</p>
                  </div>
                </div>

                {medicationDetail.instructions && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Instructions</h4>
                    <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">{medicationDetail.instructions}</p>
                  </div>
                )}

                {/* Adherence */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Adherence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Adherence Rate</span>
                        <span className="font-medium">{medicationDetail.adherence.rate}%</span>
                      </div>
                      <Progress value={medicationDetail.adherence.rate} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{medicationDetail.adherence.takenCount} taken</span>
                        <span>{medicationDetail.adherence.totalDoses} total doses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Patient Info */}
                {medicationDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span> {medicationDetail.user.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span> {medicationDetail.user.email}
                        </div>
                        {medicationDetail.user.phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span> {medicationDetail.user.phone}
                          </div>
                        )}
                        {medicationDetail.user.medSyncId && (
                          <div>
                            <span className="text-muted-foreground">MedSync ID:</span> {medicationDetail.user.medSyncId}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Doses */}
                {medicationDetail.recentDoses && medicationDetail.recentDoses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Doses</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {medicationDetail.recentDoses.map((dose) => (
                        <div
                          key={dose.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {dose.status === 'taken' ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            ) : dose.status === 'missed' ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="text-sm capitalize">{dose.status}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(dose.scheduledTime), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
