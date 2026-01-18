'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  History, 
  Search, 
  Filter,
  User,
  FileText,
  Shield,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Monitor
} from 'lucide-react';
import { useOrg } from '@/store/useOrg';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { RoleGuard } from '@/components/auth/RoleGuard';

interface AuditLog {
  id: string;
  action: string;
  actionLabel: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  target: {
    id: string;
    name: string;
    email: string;
  } | null;
  roleType: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AvailableAction {
  action: string;
  count: number;
  label: string;
}

interface AuditLogsData {
  logs: AuditLog[];
  availableActions: AvailableAction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

function getActionIcon(action: string) {
  const iconMap: Record<string, React.ReactNode> = {
    'role_invited': <UserPlus className="h-4 w-4" />,
    'role_confirmed': <CheckCircle className="h-4 w-4" />,
    'person_removed': <UserMinus className="h-4 w-4" />,
    'document_uploaded': <FileText className="h-4 w-4" />,
    'document_approved': <CheckCircle className="h-4 w-4" />,
    'document_rejected': <XCircle className="h-4 w-4" />,
    'pharmacy_approved': <Shield className="h-4 w-4" />,
    'pharmacy_suspended': <AlertTriangle className="h-4 w-4" />,
    'pharmacy_activated': <Shield className="h-4 w-4" />,
    'governance_status_changed': <Settings className="h-4 w-4" />,
    'auto_downgrade': <AlertTriangle className="h-4 w-4" />,
    'test_mode_enabled': <Settings className="h-4 w-4" />,
    'test_mode_disabled': <Settings className="h-4 w-4" />,
    'location_added': <MapPin className="h-4 w-4" />,
    'location_removed': <MapPin className="h-4 w-4" />,
    'PHARMACY_USER_UPDATED': <User className="h-4 w-4" />,
  };
  return iconMap[action] || <History className="h-4 w-4" />;
}

function getActionColor(action: string): string {
  if (action.includes('approved') || action.includes('confirmed') || action.includes('activated')) {
    return 'bg-green-100 text-green-600';
  }
  if (action.includes('rejected') || action.includes('suspended') || action.includes('removed') || action.includes('downgrade')) {
    return 'bg-red-100 text-red-600';
  }
  if (action.includes('invited') || action.includes('added') || action.includes('uploaded')) {
    return 'bg-blue-100 text-blue-600';
  }
  return 'bg-gray-100 text-gray-600';
}

function formatRoleType(roleType: string | null): string {
  if (!roleType) return '';
  const roleMap: Record<string, string> = {
    'PHARMACY_OWNER': 'Owner',
    'SUPERINTENDENT_PHARMACIST': 'Superintendent',
    'SUPERVISING_PHARMACIST': 'Supervisor',
    'STAFF': 'Staff',
  };
  return roleMap[roleType] || roleType;
}

function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Browser';
}

function formatDetailKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatDetailValue(value: any): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '-';
  return JSON.stringify(value);
}

function formatDetails(details: Record<string, any>): React.ReactNode[] {
  // Skip nested objects like 'requirements' - flatten them
  const flatDetails: Record<string, any> = {};
  
  Object.entries(details).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Flatten nested objects
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        flatDetails[nestedKey] = nestedValue;
      });
    } else {
      flatDetails[key] = value;
    }
  });

  // Filter out IDs and internal fields
  const skipKeys = ['pharmacyUserId', 'id', 'pharmacyId', 'userId'];
  
  return Object.entries(flatDetails)
    .filter(([key]) => !skipKeys.includes(key))
    .map(([key, value]) => (
      <span 
        key={key} 
        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
      >
        <span className="text-muted-foreground">{formatDetailKey(key)}:</span>
        <span className="font-medium">{formatDetailValue(value)}</span>
      </span>
    ));
}

export default function AuditLogsPage() {
  const { pharmacyId } = useOrg();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch audit logs from API
  const { data: auditData, isLoading, error } = useQuery({
    queryKey: ['audit-logs', pharmacyId, page, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (actionFilter && actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      const response = await api.get(`/pharmacy/audit-logs?${params}`);
      return response.data as AuditLogsData;
    },
    enabled: !!pharmacyId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load audit logs</h2>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const data = auditData;
  const logs = data?.logs || [];
  const pagination = data?.pagination;
  const availableActions = data?.availableActions || [];

  // Filter logs by search query (client-side)
  const filteredLogs = searchQuery
    ? logs.filter(log => 
        log.actionLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST']}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all governance and compliance activities
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={(value) => {
              setActionFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action.action} value={action.action}>
                    {action.label} ({action.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {pagination && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
              <p className="text-xs text-muted-foreground">
                All recorded activities
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Types</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableActions.length}</div>
              <p className="text-xs text-muted-foreground">
                Different activity types
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.page} / {pagination.totalPages}</div>
              <p className="text-xs text-muted-foreground">
                {pagination.limit} logs per page
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Detailed record of all pharmacy governance activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              {actionFilter !== 'all' && (
                <p className="text-sm mt-2">Try changing the filter</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Action Icon */}
                  <div className={`p-2 rounded-full shrink-0 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{log.actionLabel}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {log.actor && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actor.name}
                            </span>
                          )}
                          {log.target && (
                            <>
                              <span>→</span>
                              <span>{log.target.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {log.roleType && (
                        <Badge variant="outline" className="text-xs">
                          {formatRoleType(log.roleType)}
                        </Badge>
                      )}
                      {log.ipAddress && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress}
                        </span>
                      )}
                      {log.userAgent && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Monitor className="h-3 w-3" />
                          {parseUserAgent(log.userAgent)}
                        </span>
                      )}
                    </div>

                    {/* Additional Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formatDetails(log.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  );
}
