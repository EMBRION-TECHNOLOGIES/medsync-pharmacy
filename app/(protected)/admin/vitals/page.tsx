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
  Heart,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Activity,
  Thermometer,
  Scale,
  Droplets,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Vital {
  id: string;
  bloodPressure: string | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  bloodSugar: number | null;
  oxygenSaturation: number | null;
  notes: string | null;
  recordedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  createdAt: string;
}

interface VitalsStats {
  overview: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    uniqueUsers: number;
  };
  averages: {
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    heartRate: number;
    weight: number;
    bmi: number;
  };
}

export default function VitalsOversightPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedVital, setSelectedVital] = useState<Vital | null>(null);
  const limit = 20;

  const { data: stats } = useQuery<VitalsStats>({
    queryKey: ['admin', 'vitals-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/vitals-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'vitals-oversight', search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/vitals-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: vitalDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'vitals-oversight', selectedVital?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/vitals-oversight/${selectedVital?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedVital?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6" />
              Vitals Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor patient vitals logged across the platform
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
              <div className="text-2xl font-bold">{stats?.overview?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.overview?.thisWeek || 0}</div>
              <p className="text-sm text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.overview?.uniqueUsers || 0}</div>
              <p className="text-sm text-muted-foreground">Unique Patients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.averages?.bloodPressureSystolic || 0}/{stats?.averages?.bloodPressureDiastolic || 0}</div>
              <p className="text-sm text-muted-foreground">Avg Blood Pressure</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.averages?.heartRate || 0} bpm</div>
              <p className="text-sm text-muted-foreground">Avg Heart Rate</p>
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
                    placeholder="Search by patient..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vitals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vitals Records</CardTitle>
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
                Failed to load vitals
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Blood Pressure</TableHead>
                      <TableHead>Heart Rate</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>BMI</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.vitals && data.vitals.length > 0 ? (
                      data.vitals.map((vital: Vital) => (
                        <TableRow
                          key={vital.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedVital(vital)}
                        >
                          <TableCell>
                            {vital.user ? (
                              <div>
                                <div className="text-sm font-medium">{vital.user.name}</div>
                                <div className="text-xs text-muted-foreground">{vital.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {vital.bloodPressure || (vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                              ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                              : '-')}
                          </TableCell>
                          <TableCell>{vital.heartRate ? `${vital.heartRate} bpm` : '-'}</TableCell>
                          <TableCell>{vital.temperature ? `${vital.temperature}°C` : '-'}</TableCell>
                          <TableCell>{vital.weight ? `${vital.weight} kg` : '-'}</TableCell>
                          <TableCell>{vital.bmi ? vital.bmi.toFixed(1) : '-'}</TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(vital.recordedAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No vitals found
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
        <Dialog open={!!selectedVital} onOpenChange={(open) => !open && setSelectedVital(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Vital Record Details
              </DialogTitle>
              <DialogDescription>
                Recorded {vitalDetail?.recordedAt ? format(new Date(vitalDetail.recordedAt), 'MMMM d, yyyy h:mm a') : ''}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : vitalDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs">Blood Pressure</span>
                      </div>
                      <div className="text-xl font-bold">
                        {vitalDetail.bloodPressure || (vitalDetail.bloodPressureSystolic && vitalDetail.bloodPressureDiastolic
                          ? `${vitalDetail.bloodPressureSystolic}/${vitalDetail.bloodPressureDiastolic}`
                          : '-')}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Heart className="h-4 w-4" />
                        <span className="text-xs">Heart Rate</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.heartRate ? `${vitalDetail.heartRate} bpm` : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Thermometer className="h-4 w-4" />
                        <span className="text-xs">Temperature</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.temperature ? `${vitalDetail.temperature}°C` : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Scale className="h-4 w-4" />
                        <span className="text-xs">Weight</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.weight ? `${vitalDetail.weight} kg` : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Scale className="h-4 w-4" />
                        <span className="text-xs">Height</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.height ? `${vitalDetail.height} cm` : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs">BMI</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.bmi ? vitalDetail.bmi.toFixed(1) : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Droplets className="h-4 w-4" />
                        <span className="text-xs">Blood Sugar</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.bloodSugar ? `${vitalDetail.bloodSugar} mg/dL` : '-'}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs">Oxygen Saturation</span>
                      </div>
                      <div className="text-xl font-bold">{vitalDetail.oxygenSaturation ? `${vitalDetail.oxygenSaturation}%` : '-'}</div>
                    </CardContent>
                  </Card>
                </div>

                {vitalDetail.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{vitalDetail.notes}</p>
                  </div>
                )}

                {vitalDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {vitalDetail.user.name}</div>
                        <div className="col-span-2 break-words"><span className="text-muted-foreground">Email:</span> {vitalDetail.user.email}</div>
                        {vitalDetail.user.phone && <div><span className="text-muted-foreground">Phone:</span> {vitalDetail.user.phone}</div>}
                        {vitalDetail.user.medSyncId && <div><span className="text-muted-foreground">TeraSync ID:</span> {vitalDetail.user.medSyncId}</div>}
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
