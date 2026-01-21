'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Download,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  type: 'verification' | 'governance';
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  notes: string | null;
  details: Record<string, any> | null;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const DEFAULT_LIMIT = 25;

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    approved: 'Pharmacy Approved',
    rejected: 'Pharmacy Rejected',
    pending: 'Set to Pending',
    test_mode_enabled: 'Test Mode Enabled',
    test_mode_disabled: 'Test Mode Disabled',
    governance_status_active: 'Governance Activated',
    governance_status_suspended: 'Governance Suspended',
    governance_status_incomplete: 'Governance Incomplete',
    compliance_item_updated: 'Compliance Item Updated',
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getActionBadgeClass(action: string): string {
  if (action.includes('approved') || action.includes('active') || action.includes('enabled')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (action.includes('rejected') || action.includes('suspended') || action.includes('disabled')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (action.includes('pending') || action.includes('incomplete')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function getTypeBadgeClass(type: string): string {
  return type === 'verification'
    ? 'bg-blue-100 text-blue-800 border-blue-200'
    : 'bg-purple-100 text-purple-800 border-purple-200';
}

function formatDetails(details: Record<string, any>): React.ReactNode {
  // Extract key information from details object
  const keyFields = ['item', 'name', 'email', 'status', 'reason', 'verificationStatus', 'roleType', 'address'];
  const displayParts: string[] = [];
  
  for (const key of keyFields) {
    if (details[key] !== undefined && details[key] !== null) {
      const value = typeof details[key] === 'object' 
        ? JSON.stringify(details[key]) 
        : String(details[key]);
      displayParts.push(`${value}`);
    }
  }
  
  // If no key fields found, show first few key-value pairs
  if (displayParts.length === 0) {
    const entries = Object.entries(details).slice(0, 2);
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        const displayValue = typeof value === 'object' 
          ? JSON.stringify(value).slice(0, 30) 
          : String(value).slice(0, 30);
        displayParts.push(displayValue);
      }
    }
  }
  
  const displayText = displayParts.join(', ');
  const truncated = displayText.length > 50 ? displayText.slice(0, 50) + '...' : displayText;
  
  return (
    <span 
      className="truncate block cursor-help" 
      title={JSON.stringify(details, null, 2)}
    >
      {truncated || '—'}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', { page, typeFilter, appliedSearch, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', DEFAULT_LIMIT.toString());
      params.append('offset', (page * DEFAULT_LIMIT).toString());
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (appliedSearch) params.append('pharmacyId', appliedSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const logs = data?.logs || [];
  const total = data?.pagination?.total || 0;
  const hasMore = data?.pagination?.hasMore || false;
  const totalPages = Math.ceil(total / DEFAULT_LIMIT);

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setTypeFilter('all');
    setSearchInput('');
    setAppliedSearch('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (appliedSearch) params.append('pharmacyId', appliedSearch);

      const response = await api.get(`/admin/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      fallback={
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You need admin access to view audit logs.
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all admin actions and system events
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pharmacy ID</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter pharmacy ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              <div className="space-y-2 flex items-end gap-2">
                <Button onClick={handleSearch} className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${total} log entries found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[180px]">Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead className="w-[200px]">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {format(new Date(log.createdAt), 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.createdAt), 'HH:mm:ss')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTypeBadgeClass(log.type)}>
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{log.entityName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {log.entityId.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.actor ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{log.actor.name}</p>
                                  <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.notes ? (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]" title={log.notes}>
                                {log.notes}
                              </p>
                            ) : log.details ? (
                              <div className="text-sm text-muted-foreground max-w-[200px]">
                                {formatDetails(log.details)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * DEFAULT_LIMIT + 1}–{Math.min((page + 1) * DEFAULT_LIMIT, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || isFetching}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore || isFetching}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
