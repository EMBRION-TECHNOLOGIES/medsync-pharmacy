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
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Paperclip,
  Building,
  Stethoscope,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface HealthRecord {
  id: string;
  source: 'health' | 'medical';
  recordType: string;
  title: string;
  description?: string;
  value?: string;
  unit?: string;
  date: string;
  notes?: string;
  doctor?: string;
  hospital?: string;
  hasAttachments: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  createdAt: string;
}

interface HealthRecordsStats {
  healthRecords: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    uniqueUsers: number;
    byType: Array<{ type: string; count: number }>;
  };
  medicalRecords: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    uniqueUsers: number;
    byType: Array<{ type: string; count: number }>;
  };
  combined: {
    total: number;
    thisWeek: number;
    thisMonth: number;
  };
}

const sourceColors: Record<string, string> = {
  health: 'bg-blue-100 text-blue-800',
  medical: 'bg-purple-100 text-purple-800',
};

export default function HealthRecordsOversightPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const limit = 20;

  const { data: stats } = useQuery<HealthRecordsStats>({
    queryKey: ['admin', 'health-records-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/health-records-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'health-records-oversight', search, typeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/health-records-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: recordDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'health-records-oversight', selectedRecord?.id, selectedRecord?.source],
    queryFn: async () => {
      const response = await api.get(`/admin/health-records-oversight/${selectedRecord?.id}?source=${selectedRecord?.source}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedRecord?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Health Records Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor health and medical records across the platform
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.combined?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.healthRecords?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Health Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats?.medicalRecords?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Medical Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.combined?.thisWeek || 0}</div>
              <p className="text-sm text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
        </div>

        {/* Record Type Breakdown */}
        {(stats?.healthRecords?.byType?.length || stats?.medicalRecords?.byType?.length) && (
          <div className="grid gap-4 md:grid-cols-2">
            {stats?.healthRecords?.byType && stats.healthRecords.byType.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Health Record Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.healthRecords.byType.map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {t.type}: {t.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {stats?.medicalRecords?.byType && stats.medicalRecords.byType.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Medical Record Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.medicalRecords.byType.map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {t.type}: {t.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title..."
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
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="health">Health Records</SelectItem>
                  <SelectItem value="medical">Medical Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
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
                Failed to load records
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.records && data.records.length > 0 ? (
                      data.records.map((record: HealthRecord) => (
                        <TableRow
                          key={`${record.source}-${record.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <TableCell className="font-medium">{record.title}</TableCell>
                          <TableCell>
                            {record.user ? (
                              <div>
                                <div className="text-sm">{record.user.name}</div>
                                <div className="text-xs text-muted-foreground">{record.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>{record.recordType}</TableCell>
                          <TableCell>
                            <Badge className={sourceColors[record.source] || 'bg-gray-100'}>
                              {record.source}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {record.hasAttachments ? (
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No records found
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
        <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {recordDetail?.title || selectedRecord?.title}
              </DialogTitle>
              <DialogDescription>
                {recordDetail?.recordType || selectedRecord?.recordType} - {recordDetail?.source || selectedRecord?.source} record
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : recordDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Record Type</h4>
                    <p>{recordDetail.recordType}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                    <p>{format(new Date(recordDetail.date), 'MMMM d, yyyy')}</p>
                  </div>
                  {recordDetail.value && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Value</h4>
                      <p>{recordDetail.value} {recordDetail.unit}</p>
                    </div>
                  )}
                  {recordDetail.doctor && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Doctor</h4>
                        <p>{recordDetail.doctor}</p>
                      </div>
                    </div>
                  )}
                  {recordDetail.hospital && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Hospital</h4>
                        <p>{recordDetail.hospital}</p>
                      </div>
                    </div>
                  )}
                </div>

                {(recordDetail.description || recordDetail.notes) && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {recordDetail.description ? 'Description' : 'Notes'}
                    </h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {recordDetail.description || recordDetail.notes}
                    </p>
                  </div>
                )}

                {recordDetail.attachments && recordDetail.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {recordDetail.attachments.map((att: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          Attachment {idx + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {recordDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {recordDetail.user.name}</div>
                        <div className="col-span-2 break-words"><span className="text-muted-foreground">Email:</span> {recordDetail.user.email}</div>
                        {recordDetail.user.phone && <div><span className="text-muted-foreground">Phone:</span> {recordDetail.user.phone}</div>}
                        {recordDetail.user.medSyncId && <div><span className="text-muted-foreground">TeraSync ID:</span> {recordDetail.user.medSyncId}</div>}
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
