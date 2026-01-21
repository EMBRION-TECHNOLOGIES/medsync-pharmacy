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
  StickyNote,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Pin,
  Archive,
  Bot,
  User,
  Tag,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Note {
  id: string;
  title: string;
  contentPreview: string;
  category: string | null;
  tags: string[];
  isPinned: boolean;
  isPrivate: boolean;
  allowAIToUse: boolean;
  isArchived: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    medSyncId: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface NotesStats {
  overview: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    pinned: number;
    archived: number;
    aiEnabled: number;
    uniqueUsers: number;
  };
  byCategory: Array<{ category: string; count: number }>;
}

export default function NotesOversightPage() {
  const [search, setSearch] = useState('');
  const [archivedFilter, setArchivedFilter] = useState<string>('false');
  const [page, setPage] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const limit = 20;

  const { data: stats } = useQuery<NotesStats>({
    queryKey: ['admin', 'notes-oversight', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/notes-oversight/stats');
      return response.data?.data || response.data;
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'notes-oversight', search, archivedFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (archivedFilter !== 'all') params.append('isArchived', archivedFilter);
      params.append('limit', String(limit));
      params.append('offset', String(page * limit));

      const response = await api.get(`/admin/notes-oversight?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: noteDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'notes-oversight', selectedNote?.id],
    queryFn: async () => {
      const response = await api.get(`/admin/notes-oversight/${selectedNote?.id}`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedNote?.id,
  });

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <StickyNote className="h-6 w-6" />
              Notes Oversight
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor patient notes across the platform
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
              <p className="text-sm text-muted-foreground">Total Notes</p>
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
              <div className="text-2xl font-bold text-amber-600">{stats?.overview?.pinned || 0}</div>
              <p className="text-sm text-muted-foreground">Pinned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats?.overview?.aiEnabled || 0}</div>
              <p className="text-sm text-muted-foreground">AI Enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats?.overview?.uniqueUsers || 0}</div>
              <p className="text-sm text-muted-foreground">Unique Users</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {stats?.byCategory && stats.byCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.byCategory.map((c, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {c.category}: {c.count}
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
                    placeholder="Search by title or content..."
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
                value={archivedFilter}
                onValueChange={(value) => {
                  setArchivedFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  <SelectItem value="false">Active</SelectItem>
                  <SelectItem value="true">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Click to view full content</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to load notes
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.notes && data.notes.length > 0 ? (
                      data.notes.map((note: Note) => (
                        <TableRow
                          key={note.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedNote(note)}
                        >
                          <TableCell>
                            <div className="font-medium">{note.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {note.contentPreview}
                            </div>
                          </TableCell>
                          <TableCell>
                            {note.user ? (
                              <div>
                                <div className="text-sm">{note.user.name}</div>
                                <div className="text-xs text-muted-foreground">{note.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>{note.category || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {note.isPinned && (
                                <span title="Pinned">
                                  <Pin className="h-4 w-4 text-amber-500" />
                                </span>
                              )}
                              {note.allowAIToUse && (
                                <span title="AI Enabled">
                                  <Bot className="h-4 w-4 text-purple-500" />
                                </span>
                              )}
                              {note.isArchived && (
                                <span title="Archived">
                                  <Archive className="h-4 w-4 text-gray-500" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No notes found
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
        <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                {noteDetail?.title || selectedNote?.title}
              </DialogTitle>
              <DialogDescription>
                {noteDetail?.category || 'Uncategorized'}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : noteDetail ? (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {noteDetail.isPinned && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  {noteDetail.allowAIToUse && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-800">
                      <Bot className="h-3 w-3" />
                      AI Enabled
                    </Badge>
                  )}
                  {noteDetail.isArchived && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Archive className="h-3 w-3" />
                      Archived
                    </Badge>
                  )}
                  {noteDetail.isPrivate && (
                    <Badge variant="outline">Private</Badge>
                  )}
                </div>

                {noteDetail.tags && noteDetail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {noteDetail.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Content</h4>
                  <div className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                    {noteDetail.content}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {format(new Date(noteDetail.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>{' '}
                    {format(new Date(noteDetail.updatedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>

                {noteDetail.user && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Author
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {noteDetail.user.name}</div>
                        <div className="col-span-2 break-words"><span className="text-muted-foreground">Email:</span> {noteDetail.user.email}</div>
                        {noteDetail.user.phone && <div><span className="text-muted-foreground">Phone:</span> {noteDetail.user.phone}</div>}
                        {noteDetail.user.medSyncId && <div><span className="text-muted-foreground">MedSync ID:</span> {noteDetail.user.medSyncId}</div>}
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
