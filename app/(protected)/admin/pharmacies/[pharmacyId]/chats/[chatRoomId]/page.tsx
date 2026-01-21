'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  MessageSquare,
  Package,
  User,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatParticipant {
  id: string;
  userId: string;
  name: string;
  role: string;
  userRole: string | null;
  isPatient: boolean;
  isActive: boolean;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  messageType: string;
  attachments: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string | null;
    isPatient: boolean;
  };
}

interface ChatDetailResponse {
  order: {
    id: string;
    orderNumber: string;
    orderCode: string | null;
    status: string;
    drugName: string | null;
    totalAmount: number;
    patient: { id: string; name: string; medSyncId: string | null } | null;
  };
  chatRoom: {
    id: string;
    type: string;
    isActive: boolean;
    createdAt: string;
  };
  participants: ChatParticipant[];
  messages: ChatMessage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pharmacyId = params.pharmacyId as string;
  const chatRoomId = params.chatRoomId as string;

  const { data, isLoading, error, refetch } = useQuery<ChatDetailResponse>({
    queryKey: ['admin', 'pharmacy', pharmacyId, 'chat', chatRoomId],
    queryFn: async () => {
      const response = await api.get(`/admin/pharmacy-management/${pharmacyId}/chats/${chatRoomId}?limit=100`);
      return response.data?.data || response.data;
    },
    enabled: !!pharmacyId && !!chatRoomId,
  });

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </RoleGuard>
    );
  }

  if (error || !data) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Chat not found</h2>
            <p className="text-muted-foreground mt-2">
              This chat may not exist or doesn&apos;t belong to this pharmacy.
            </p>
            <Button className="mt-4" onClick={() => router.push(`/admin/pharmacies/${pharmacyId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pharmacy
            </Button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/pharmacies/${pharmacyId}?tab=chats`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat: {data.order.orderNumber}
                </h1>
                <Badge variant={data.chatRoom.isActive ? 'default' : 'secondary'}>
                  {data.chatRoom.isActive ? 'Active' : 'Closed'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {data.pagination.total} messages • Started {format(new Date(data.chatRoom.createdAt), 'PPp')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Chat Messages */}
          <div className="col-span-2">
            <Card className="h-[calc(100vh-250px)]">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Messages</CardTitle>
                <CardDescription>
                  Read-only view of the conversation
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto h-[calc(100%-80px)]">
                <div className="space-y-4 p-4">
                  {data.messages.length > 0 ? (
                    data.messages.map((message, index) => {
                      const showDateSeparator =
                        index === 0 ||
                        new Date(message.createdAt).toDateString() !==
                          new Date(data.messages[index - 1].createdAt).toDateString();

                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-4">
                              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                                {format(new Date(message.createdAt), 'EEEE, MMMM d, yyyy')}
                              </div>
                            </div>
                          )}
                          <div
                            className={`flex ${
                              message.sender.isPatient ? 'justify-start' : 'justify-end'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender.isPatient
                                  ? 'bg-muted'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-xs font-medium ${
                                    message.sender.isPatient ? '' : 'text-primary-foreground/80'
                                  }`}
                                >
                                  {message.sender.name}
                                  {message.sender.isPatient && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Patient
                                    </Badge>
                                  )}
                                </span>
                              </div>
                              {message.isDeleted ? (
                                <p className="text-sm italic opacity-60">[Message deleted]</p>
                              ) : (
                                <>
                                  {message.messageType === 'image' ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <ImageIcon className="h-4 w-4" />
                                      <span>[Image attachment]</span>
                                    </div>
                                  ) : message.messageType === 'file' ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <FileText className="h-4 w-4" />
                                      <span>[File attachment]</span>
                                    </div>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 text-xs opacity-70">
                                      {message.attachments.length} attachment(s)
                                    </div>
                                  )}
                                </>
                              )}
                              <div
                                className={`text-xs mt-1 ${
                                  message.sender.isPatient
                                    ? 'text-muted-foreground'
                                    : 'text-primary-foreground/70'
                                }`}
                              >
                                {format(new Date(message.createdAt), 'h:mm a')}
                                {message.isEdited && ' (edited)'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      No messages in this conversation
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Order & Participants */}
          <div className="space-y-4">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-mono font-medium">{data.order.orderNumber}</p>
                </div>
                {data.order.orderCode && (
                  <div>
                    <p className="text-muted-foreground">Order Code</p>
                    <p className="font-mono">{data.order.orderCode}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline">{data.order.status}</Badge>
                </div>
                {data.order.drugName && (
                  <div>
                    <p className="text-muted-foreground">Drug</p>
                    <p className="font-medium">{data.order.drugName}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(data.order.totalAmount)}</p>
                </div>
                {data.order.patient && (
                  <div>
                    <p className="text-muted-foreground">Patient</p>
                    <p>{data.order.patient.name}</p>
                    <p className="text-xs text-muted-foreground">{data.order.patient.medSyncId}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Participants ({data.participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{participant.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {participant.isPatient && (
                            <Badge variant="outline" className="text-xs">Patient</Badge>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            {participant.role}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={participant.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {participant.isActive ? 'Active' : 'Left'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Notice */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Read-Only View</p>
                    <p className="text-sm text-amber-700 mt-1">
                      As an admin, you can view chat history but cannot send messages or modify
                      this conversation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
