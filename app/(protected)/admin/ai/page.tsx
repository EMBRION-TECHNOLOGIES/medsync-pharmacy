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
  Bot,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Zap,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AIInvocation {
  id: string;
  prompt: string | null;
  response: string | null;
  model: string;
  modelVersion: string | null;
  tokensUsed: number | null;
  cost: number | null;
  duration: number | null;
  status: string;
  error: string | null;
  route: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  createdAt: string;
}

interface AIStats {
  overview: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  usage: {
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
    currency: string;
  };
  byRoute: Array<{ route: string; count: number }>;
  byModel: Array<{ model: string; count: number; tokens: number; cost: number }>;
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AIOverviewPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedInvocation, setSelectedInvocation] = useState<AIInvocation | null>(null);
  const limit = 20;

  const { data: stats, isLoading: statsLoading } = useQuery<AIStats>({
    queryKey: ['admin', 'ai-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/ai-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'ai-oversight', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/ai-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: invocationDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'ai-oversight', selectedInvocation?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/ai-oversight/${selectedInvocation?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedInvocation?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6" />
              AI Usage Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor AI invocations and usage across the platform
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
              <p className="text-sm text-muted-foreground">Total Invocations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.overview?.today || 0}</div>
              <p className="text-sm text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.overview?.successRate || 0}%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(stats?.usage?.totalTokens || 0).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">${(stats?.usage?.totalCost || 0).toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </CardContent>
          </Card>
        </div>

        {/* Model Breakdown */}
        {stats?.byModel && stats.byModel.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.byModel.map((m, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {m.model}: {m.count} calls ({m.tokens.toLocaleString()} tokens)
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
                    placeholder="Search by prompt or route..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invocations Table */}
        <Card>
          <CardHeader>
            <CardTitle>AI Invocations</CardTitle>
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
                Failed to load AI invocations
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.invocations && data.invocations.length > 0 ? (
                      data.invocations.map((inv: AIInvocation) => (
                        <TableRow
                          key={inv.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedInvocation(inv)}
                        >
                          <TableCell className="font-mono text-sm">{inv.route || '-'}</TableCell>
                          <TableCell>
                            {inv.user ? (
                              <div>
                                <div className="text-sm">{inv.user.name}</div>
                                <div className="text-xs text-muted-foreground">{inv.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell>{inv.model}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[inv.status] || 'bg-gray-100'}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{inv.tokensUsed?.toLocaleString() || '-'}</TableCell>
                          <TableCell className="text-right">
                            {inv.duration ? `${inv.duration}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No invocations found
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
        <Dialog open={!!selectedInvocation} onOpenChange={(open) => !open && setSelectedInvocation(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Invocation Details
              </DialogTitle>
              <DialogDescription>
                {invocationDetail?.route || selectedInvocation?.route || 'Unknown route'}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : invocationDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <Badge className={statusColors[invocationDetail.status] || 'bg-gray-100'}>
                      {invocationDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Model</h4>
                    <p>{invocationDetail.model} {invocationDetail.modelVersion && `(${invocationDetail.modelVersion})`}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tokens Used</h4>
                    <p>{invocationDetail.tokensUsed?.toLocaleString() || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Cost</h4>
                    <p>${invocationDetail.cost?.toFixed(4) || '0.00'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                    <p>{invocationDetail.duration ? `${invocationDetail.duration}ms` : '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
                    <p>{format(new Date(invocationDetail.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>

                {invocationDetail.prompt && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Prompt</h4>
                    <pre className="text-sm bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {invocationDetail.prompt}
                    </pre>
                  </div>
                )}

                {invocationDetail.response && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Response</h4>
                    <pre className="text-sm bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {invocationDetail.response}
                    </pre>
                  </div>
                )}

                {invocationDetail.error && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Error</h4>
                    <pre className="text-sm bg-red-50 text-red-800 p-3 rounded-lg overflow-x-auto">
                      {invocationDetail.error}
                    </pre>
                  </div>
                )}

                {invocationDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">User</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {invocationDetail.user.name}</div>
                        <div><span className="text-muted-foreground">Email:</span> {invocationDetail.user.email}</div>
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
