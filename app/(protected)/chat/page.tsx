'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatOrders, useChatMessages, useSendMessage } from '@/features/chat-orders/hooks';
import { useChatRoomSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useOrg } from '@/store/useOrg';
import { ChatRoom } from '@/lib/zod-schemas';
import { ThreadList } from '@/components/chat/ThreadList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageInput } from '@/components/chat/MessageInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const { pharmacyId, locationId } = useOrg();
  const searchParams = useSearchParams();
  const [selectedThread, setSelectedThread] = useState<ChatRoom | null>(null);

  const { data: chatOrdersData, isLoading: threadsLoading, error, isError, refetch: refetchChatOrders } = useChatOrders({
    status: 'all',
  });
  const chatRooms = chatOrdersData?.rooms || [];
  
  // Debug logging
  if (isError) {
    console.error('❌ CHAT ORDERS ERROR:', error);
  }
  if (chatOrdersData) {
    console.log('📦 Chat Orders Response:', {
      rooms: chatOrdersData.rooms,
      orders: chatOrdersData.orders,
      total: chatOrdersData.total,
      roomsLength: chatOrdersData.rooms?.length
    });
  }

  const { data: messages } = useChatMessages(selectedThread?.id || '');
  const sendMessage = useSendMessage();

  // Use new socket hook for real-time updates
  const socket = useChatRoomSocket(selectedThread?.id);

  const handleSendMessage = (content: string) => {
    if (selectedThread) {
      sendMessage.mutate({ roomId: selectedThread.id, content });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedThread) {
      socket.sendTyping(selectedThread.id, isTyping);
    }
  };

  const handleOrderCreated = (orderId: string) => {
    console.log('Order created:', orderId);
    // Refresh chat data to show new order
    refetchChatOrders();
  };

  const handleQuickAction = (action: 'note' | 'escalate') => {
    switch (action) {
      case 'note':
        const note = prompt('Add a note to this conversation:');
        if (note && selectedThread) {
          // TODO: Send note to backend
          console.log('Adding note to thread:', selectedThread.id, note);
        }
        break;
      case 'escalate':
        const reason = prompt('Reason for escalation:');
        if (reason && selectedThread) {
          // TODO: Escalate conversation to backend
          console.log('Escalating thread:', selectedThread.id, reason);
        }
        break;
    }
  };

  // Auto-select thread from URL params
  useEffect(() => {
    const roomId = searchParams.get('roomId');
    if (roomId && chatRooms.length > 0) {
      const thread = chatRooms.find(r => r.id === roomId);
      if (thread) {
        setSelectedThread(thread);
      }
    }
  }, [searchParams, chatRooms]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">
          Communicate with patients
        </p>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Thread List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ThreadList
                threads={chatRooms || []}
                selectedThreadId={selectedThread?.id}
                onSelectThread={setSelectedThread}
              />
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedThread ? (
                <span className="font-mono text-sm">
                  {selectedThread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name || 'Unknown Patient'}
                </span>
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            {selectedThread ? (
              <>
                <ChatWindow 
                  messages={messages?.messages || []} 
                  patientAlias={selectedThread?.participants.find(p => p.type === 'patient')?.id || 'Unknown'}
                  threadId={selectedThread?.id}
                  patientId={selectedThread?.participants.find(p => p.type === 'patient')?.id || 'Unknown'}
        />
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={sendMessage.isPending}
                  onQuickAction={handleQuickAction}
                  roomId={selectedThread?.id}
                  onTyping={handleTyping}
                  onOrderCreated={handleOrderCreated}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

