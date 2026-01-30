'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatOrders, useChatMessages, useSendMessage } from '@/features/chat-orders/hooks';
import { useChatRoomSocket } from '@/features/chat-orders/useChatOrdersSocket';
import { useOrg } from '@/store/useOrg';
import { ChatRoom } from '@/lib/zod-schemas';
import { ThreadList } from '@/components/chat/ThreadList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw } from 'lucide-react';

export default function ChatPage() {
  const { locationId, locationName } = useOrg();
  const searchParams = useSearchParams();
  const [selectedThread, setSelectedThread] = useState<ChatRoom | null>(null);
  const [showThreadList, setShowThreadList] = useState(true); // Mobile: show thread list by default

  const { data: chatOrdersData, isLoading: threadsLoading, error, isError, refetch: refetchChatOrders, isFetching } = useChatOrders({
    status: 'all',
  });

  // Deduplicate chat rooms by patient ID (keep the one with the latest message)
  const chatRooms = useMemo(() => {
    const rooms = chatOrdersData?.rooms || [];
    const patientRoomMap = new Map<string, ChatRoom>();

    for (const room of rooms) {
      const patientParticipant = room.participants.find(
        p => p.type === 'PATIENT' || p.type === 'patient'
      );
      const patientId = patientParticipant?.id || room.id;

      const existingRoom = patientRoomMap.get(patientId);
      if (!existingRoom) {
        patientRoomMap.set(patientId, room);
      } else {
        // Keep the room with the more recent lastMessage
        const existingDate = existingRoom.lastMessage?.createdAt
          ? new Date(existingRoom.lastMessage.createdAt).getTime()
          : 0;
        const currentDate = room.lastMessage?.createdAt
          ? new Date(room.lastMessage.createdAt).getTime()
          : 0;

        if (currentDate > existingDate) {
          patientRoomMap.set(patientId, room);
        }
      }
    }

    // Return deduped rooms sorted by last message date
    return Array.from(patientRoomMap.values()).sort((a, b) => {
      const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [chatOrdersData?.rooms]);
  
  // Refetch when location changes
  useEffect(() => {
    refetchChatOrders();
  }, [locationId, refetchChatOrders]);
  
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
    // useSearchParams() returns a ReadonlyURLSearchParams object, not a Promise
    // Accessing .get() is safe in client components
    const roomId = searchParams?.get('roomId');
    if (roomId && chatRooms.length > 0) {
      const thread = chatRooms.find(r => r.id === roomId);
      if (thread) {
        setSelectedThread(thread);
        setShowThreadList(false); // Hide thread list on mobile when thread is selected
      }
    }
  }, [searchParams, chatRooms]);

  // Handle thread selection - hide thread list on mobile
  const handleSelectThread: (thread: ChatRoom) => void = (thread) => {
    setSelectedThread(thread);
    setShowThreadList(false); // Hide thread list on mobile
  };

  // Handle back to thread list on mobile
  const handleBackToThreads = () => {
    setShowThreadList(true);
    setSelectedThread(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
      {/* Header - fixed, no scroll */}
      <div className="flex items-center justify-between px-2 sm:px-0 shrink-0 py-2 sm:py-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chat</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {locationName ? `Viewing ${locationName}` : 'Communicate with patients'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchChatOrders()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Chat Interface - fixed height, only inner streams scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Thread List - scrolls inside (py-0 overrides Card default py-6) */}
        <Card className={`lg:col-span-1 flex flex-col min-h-0 overflow-hidden py-0 gap-2 ${showThreadList ? 'flex' : 'hidden lg:flex'}`}>
          <CardHeader className="pb-2 pt-3 px-3 shrink-0">
            <CardTitle className="text-base sm:text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 overflow-hidden flex flex-col">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ThreadList
                threads={chatRooms || []}
                selectedThreadId={selectedThread?.id}
                onSelectThread={handleSelectThread}
              />
            )}
          </CardContent>
        </Card>

        {/* Chat Window - messages stream scrolls inside (py-0 overrides Card default py-6) */}
        <Card className={`${showThreadList ? 'hidden lg:flex lg:col-span-2' : 'flex lg:col-span-2'} flex-col min-h-0 overflow-hidden py-0 gap-2`}>
          <CardHeader className="pb-2 pt-3 px-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToThreads}
                className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Back to conversations"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-1">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                {selectedThread ? (
                  <span className="font-mono text-xs sm:text-sm truncate">
                    {selectedThread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.name ?? 'Unknown Patient'}
                  </span>
                ) : (
                  'Select a conversation'
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
            {selectedThread ? (
              <ChatWindow 
                messages={messages?.messages || []} 
                patientAlias={selectedThread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.id ?? 'Unknown'}
                threadId={selectedThread.id}
                patientId={selectedThread.participants.find(p => p.type === 'PATIENT' || p.type === 'patient')?.id ?? 'Unknown'}
                onSend={handleSendMessage}
                roomId={selectedThread.id}
                onQuickAction={handleQuickAction}
                onOrderCreated={handleOrderCreated}
              />
            ) : (
              <div className="flex items-center justify-center flex-1 text-muted-foreground p-4">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

