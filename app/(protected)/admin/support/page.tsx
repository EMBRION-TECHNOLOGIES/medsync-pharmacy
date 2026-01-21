'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Headphones,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  User,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string | null;
  priority: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  messageCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    isStaff: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string | null;
  priority: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    medSyncId: string | null;
    memberSince: string;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    isStaff: boolean;
    sender: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TicketsResponse {
  tickets: SupportTicket[];
  filters: {
    statuses: Array<{ status: string; count: number }>;
    categories: Array<{ category: string; count: number }>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  pending: 'bg-purple-100 text-purple-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function SupportTicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery<TicketsResponse>({
    queryKey: ['admin', 'support', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/support?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery<TicketDetail>({
    queryKey: ['admin', 'support', selectedTicket?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/support/${selectedTicket?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedTicket?.id,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await api.post(`/admin/support/${ticketId}/reply`, { content });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply sent successfully');
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
    onError: () => {
      toast.error('Failed to send reply');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const response = await api.patch(`/admin/support/${ticketId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/admin/support/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `support-tickets-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyContent.trim()) return;
    replyMutation.mutate({ ticketId: selectedTicket.id, content: replyContent });
  };

  const handleStatusChange = (ticketId: string, status: string) => {
    statusMutation.mutate({ ticketId, status });
  };

  const openTickets = data?.filters.statuses.find((s) => s.status === 'open')?.count || 0;
  const inProgressTickets = data?.filters.statuses.find((s) => s.status === 'in_progress')?.count || 0;

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headphones className="h-6 w-6" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer support requests
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{data?.pagination.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
          <Card className={openTickets > 0 ? 'border-blue-200 bg-blue-50' : ''}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{openTickets}</div>
              <p className="text-sm text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card className={inProgressTickets > 0 ? 'border-amber-200 bg-amber-50' : ''}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{inProgressTickets}</div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">
                {data?.filters.statuses.find((s) => s.status === 'resolved')?.count || 0}
              </div>
              <p className="text-sm text-muted-foreground">Resolved</p>
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
                    placeholder="Search by subject, ticket number..."
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
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              Click on a ticket to view details and respond
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
                Failed to load tickets
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-center">Messages</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.tickets && data.tickets.length > 0 ? (
                      data.tickets.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedTicket(ticket as any)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{ticket.subject}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {ticket.ticketNumber || ticket.id.slice(0, 8)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ticket.user ? (
                              <div>
                                <div className="text-sm">{ticket.user.name}</div>
                                <div className="text-xs text-muted-foreground">{ticket.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[ticket.status] || 'bg-gray-100'}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.priority ? (
                              <Badge variant="outline" className={priorityColors[ticket.priority] || ''}>
                                {ticket.priority}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              {ticket.messageCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                            </div>
                            {ticket.lastMessage && (
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {ticket.lastMessage.isStaff ? '(Staff) ' : ''}
                                {ticket.lastMessage.content}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No tickets found
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

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                {ticketDetail?.subject || selectedTicket?.subject}
              </DialogTitle>
              <DialogDescription>
                Ticket #{ticketDetail?.ticketNumber || selectedTicket?.ticketNumber || selectedTicket?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : ticketDetail ? (
              <div className="space-y-6">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <Select
                      value={ticketDetail.status}
                      onValueChange={(value) => handleStatusChange(ticketDetail.id, value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                    <p className="mt-1">{ticketDetail.category || 'General'}</p>
                  </div>
                </div>

                {/* User Info */}
                {ticketDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span> {ticketDetail.user.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span> {ticketDetail.user.email}
                        </div>
                        {ticketDetail.user.phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span> {ticketDetail.user.phone}
                          </div>
                        )}
                        {ticketDetail.user.medSyncId && (
                          <div>
                            <span className="text-muted-foreground">MedSync ID:</span> {ticketDetail.user.medSyncId}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{ticketDetail.description}</p>
                </div>

                {/* Messages */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Conversation ({ticketDetail.messages.length} messages)
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {ticketDetail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.isStaff ? 'bg-blue-50 ml-8' : 'bg-muted/50 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {msg.isStaff ? '(Staff) ' : ''}
                            {msg.sender?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Box */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Reply</h4>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
