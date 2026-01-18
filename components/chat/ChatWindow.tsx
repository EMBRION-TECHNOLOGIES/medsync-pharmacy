'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { GiftedChat, IMessage } from 'react-web-gifted-chat';
import { ChatMessage } from '@/lib/zod-schemas';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks';
import { transformPharmacyMessagesToGifted, transformGiftedToPharmacyMessage } from '@/lib/chat/giftedChatAdapters';
import { PharmacyChatBubble } from './gifted/PharmacyChatBubble';
import { PharmacyInputToolbar } from './gifted/PharmacyInputToolbar';

interface ChatWindowProps {
  messages: ChatMessage[];
  patientAlias?: string;
  threadId?: string;
  patientId?: string;
  onSend?: (content: string) => void;
  roomId?: string;
  onQuickAction?: (action: 'note' | 'escalate') => void;
  onOrderCreated?: (orderId: string) => void;
}

export function ChatWindow({ 
  messages, 
  patientId, 
  onSend,
  roomId,
  onQuickAction,
  onOrderCreated 
}: ChatWindowProps) {
  const { user } = useAuth();
  const [giftedMessages, setGiftedMessages] = useState<IMessage[]>([]);

  // Transform messages to Gifted Chat format
  useEffect(() => {
    if (!user?.id || !messages.length) {
      setGiftedMessages([]);
      return;
    }
    const transformed = transformPharmacyMessagesToGifted(messages, user.id, patientId);
    setGiftedMessages(transformed);
  }, [messages, user?.id, patientId]);

  // Gifted Chat user object
  const currentUser = useMemo(() => {
    if (!user?.id) return { _id: 'pharmacy', name: 'Pharmacy' };
    return {
      _id: user.id,
      name: 'Pharmacy',
    };
  }, [user?.id]);

  // Handle sending messages
  const handleSend = useCallback((newMessages: IMessage[] = []) => {
    if (newMessages.length === 0 || !onSend || !roomId) return;
    
    const message = newMessages[0];
    const pharmacyMessage = transformGiftedToPharmacyMessage(message, user?.id || '', roomId);
    
    // Optimistically add message
    setGiftedMessages((prev) => [message, ...prev]);
    
    // Send to backend
    onSend(pharmacyMessage.content);
  }, [onSend, roomId, user?.id]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] sm:h-[calc(100vh-300px)] text-muted-foreground p-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto opacity-50" />
          <p className="text-sm sm:text-base">No messages yet</p>
          <p className="text-xs sm:text-sm">Start the conversation</p>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Patient messages are processed automatically by the backend
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-300px)] flex flex-col">
      <GiftedChat
        messages={giftedMessages}
        user={currentUser}
        onSend={handleSend}
        renderBubble={(props) => <PharmacyChatBubble {...props} />}
        renderInputToolbar={(props) => (
          <PharmacyInputToolbar
            {...props}
            roomId={roomId}
            onQuickAction={onQuickAction}
            onOrderCreated={onOrderCreated}
          />
        )}
        showUserAvatar={false}
        showAvatarForEveryMessage={false}
        infiniteScroll
        isTyping={false}
        placeholder=""
        locale="en"
        timeFormat="HH:mm"
        dateFormat=""
        renderDay={(dayProps) => {
          // Custom date separator rendering
          const date = dayProps.currentMessage?.createdAt;
          if (!date) return null;
          
          const today = new Date();
          const messageDate = new Date(date);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const messageDateMidnight = new Date(messageDate);
          messageDateMidnight.setHours(0, 0, 0, 0);
          const todayMidnight = new Date(today);
          todayMidnight.setHours(0, 0, 0, 0);
          const yesterdayMidnight = new Date(yesterday);
          yesterdayMidnight.setHours(0, 0, 0, 0);
          
          let dateLabel = '';
          if (messageDateMidnight.getTime() === todayMidnight.getTime()) {
            dateLabel = 'Today';
          } else if (messageDateMidnight.getTime() === yesterdayMidnight.getTime()) {
            dateLabel = 'Yesterday';
          } else {
            const daysDiff = Math.floor((todayMidnight.getTime() - messageDateMidnight.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < 7) {
              dateLabel = messageDate.toLocaleDateString('en-US', { weekday: 'long' });
            } else {
              dateLabel = messageDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            }
          }
          
          return (
            <div className="flex items-center justify-center mt-4 mb-2">
              <div className="flex-1 h-px bg-border"></div>
              <div className="px-3 py-1.5 mx-2 bg-muted rounded-full">
                <span className="text-xs font-medium text-muted-foreground">
                  {dateLabel}
                </span>
              </div>
              <div className="flex-1 h-px bg-border"></div>
            </div>
          );
        }}
        minInputToolbarHeight={60}
        alwaysShowSend
        scrollToBottom
        scrollToBottomComponent={() => null}
        renderEmpty={() => (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
            <div className="text-center space-y-3 sm:space-y-4">
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto opacity-50" />
              <p className="text-sm sm:text-base">No messages yet</p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
