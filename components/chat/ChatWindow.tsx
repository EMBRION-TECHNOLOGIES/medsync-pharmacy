'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/zod-schemas';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks';
import { OrderForm } from './OrderForm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { useOrder } from '@/features/chat-orders/hooks';

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

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  showDateSeparator?: boolean;
  dateLabel?: string;
  onOrderClick?: (orderId: string) => void;
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDateLabel(date: Date | string): string {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDateMidnight = new Date(messageDate);
  messageDateMidnight.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  const yesterdayMidnight = new Date(yesterday);
  yesterdayMidnight.setHours(0, 0, 0, 0);

  if (messageDateMidnight.getTime() === todayMidnight.getTime()) {
    return 'Today';
  } else if (messageDateMidnight.getTime() === yesterdayMidnight.getTime()) {
    return 'Yesterday';
  } else {
    const daysDiff = Math.floor((todayMidnight.getTime() - messageDateMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return messageDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
}

function MessageBubble({ message, isCurrentUser, showDateSeparator, dateLabel, onOrderClick }: MessageBubbleProps) {
  const senderTypeLower = message.senderType?.toLowerCase();
  const isSystem = senderTypeLower === 'system' || senderTypeLower === 'ai';
  const isOrderStatus = message.content?.includes('[ORDER_STATUS]');

  // System message card
  if (isSystem && !isOrderStatus) {
    return (
      <>
        {showDateSeparator && dateLabel && <DateSeparator label={dateLabel} />}
        <div className="flex justify-center my-2">
          <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
            {message.content}
          </div>
        </div>
      </>
    );
  }

  // Order status card
  if (isOrderStatus) {
    let orderData: any = null;
    let displayText = 'Order Update';
    
    try {
      // Extract JSON after [ORDER_STATUS] tag
      const jsonMatch = message.content?.match(/\[ORDER_STATUS\](.+)$/);
      if (jsonMatch && jsonMatch[1]) {
        orderData = JSON.parse(jsonMatch[1]);
        
        // Format status text
        const status = (orderData.status || '').toLowerCase();
        const orderCode = orderData.orderCode || orderData.orderId || 'N/A';
        const messageText = orderData.message || orderData.additionalInfo || '';
        
        // Status labels
        const statusLabels: Record<string, string> = {
          pending: '⏳ Order Pending',
          confirmed: '✅ Order Confirmed',
          preparing: '📦 Preparing Order',
          prepared: '📦 Order Ready',
          paid: '💳 Payment Received',
          driver_assigned: '🚗 Driver Assigned',
          out_for_delivery: '🚚 Out for Delivery',
          dispensed: '📦 Picked Up',
          delivered: '✅ Delivered',
          cancelled: '❌ Cancelled',
          failed: '❌ Failed',
        };
        
        const statusLabel = statusLabels[status] || `📋 Order ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        displayText = `${statusLabel}\n${orderCode}${messageText ? ` • ${messageText}` : ''}`;
      }
    } catch (error) {
      console.error('Failed to parse ORDER_STATUS:', error);
      // Fallback: try to extract readable text
      const fallbackMatch = message.content?.match(/\[ORDER_STATUS\](.+)$/);
      if (fallbackMatch) {
        displayText = `Order Update: ${fallbackMatch[1].substring(0, 100)}`;
      }
    }

    const orderId = orderData?.orderId;
    const handleClick = orderId && onOrderClick ? () => onOrderClick(orderId) : undefined;

    return (
      <>
        {showDateSeparator && dateLabel && <DateSeparator label={dateLabel} />}
        <div className="flex justify-center my-2">
          <button
            onClick={handleClick}
            disabled={!handleClick}
            className={cn(
              "border text-sm px-4 py-3 rounded-lg max-w-[90%] text-left w-full transition-all",
              orderData?.status?.toLowerCase() === 'confirmed' || orderData?.status?.toLowerCase() === 'paid'
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
                : orderData?.status?.toLowerCase() === 'pending'
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                : orderData?.status?.toLowerCase() === 'preparing' || orderData?.status?.toLowerCase() === 'prepared'
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
                : "bg-primary/10 border-primary/20 text-primary",
              handleClick && "cursor-pointer hover:opacity-80 active:opacity-70",
              !handleClick && "cursor-default"
            )}
          >
            <div className="font-semibold mb-1">Order Update</div>
            <div className="text-xs whitespace-pre-line">{displayText}</div>
            {orderData?.timestamp && (
              <div className="text-[10px] opacity-70 mt-1">
                {formatTime(orderData.timestamp)}
              </div>
            )}
            {handleClick && (
              <div className="text-[10px] opacity-70 mt-2 pt-2 border-t border-current/20">
                Click to view details →
              </div>
            )}
          </button>
        </div>
      </>
    );
  }

  // Regular message bubble
  return (
    <>
      {showDateSeparator && dateLabel && <DateSeparator label={dateLabel} />}
      <div className={cn('flex mb-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[75%] px-4 py-2 rounded-2xl',
            isCurrentUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <p className={cn(
            'text-[10px] mt-1',
            isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 h-px bg-border"></div>
      <div className="px-3 py-1.5 mx-2 bg-muted rounded-full">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 h-px bg-border"></div>
    </div>
  );
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
  const [inputText, setInputText] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch order data when selected
  const { data: selectedOrder } = useOrder(selectedOrderId || '');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !onSend) return;
    onSend(inputText.trim());
    setInputText('');
  }, [inputText, onSend]);

  // Handle key press (Enter to send)
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Process messages with date separators
  const processedMessages = useMemo(() => {
    if (!messages.length) return [];

    // Sort messages oldest first for display
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let lastDateLabel = '';
    return sorted.map((msg) => {
      const currentDateLabel = getDateLabel(msg.createdAt);
      const showDateSeparator = currentDateLabel !== lastDateLabel;
      lastDateLabel = currentDateLabel;

      // Pharmacy messages: senderType is 'PHARMACY' or senderId matches current user
      const isCurrentUser = msg.senderId === user?.id || msg.senderType?.toLowerCase() === 'pharmacy';

      return {
        message: msg,
        showDateSeparator,
        dateLabel: currentDateLabel,
        isCurrentUser,
      };
    });
  }, [messages, user?.id]);

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
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {processedMessages.map(({ message, showDateSeparator, dateLabel, isCurrentUser }) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={isCurrentUser}
            showDateSeparator={showDateSeparator}
            dateLabel={dateLabel}
            onOrderClick={setSelectedOrderId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background">
        {/* Quick Actions */}
        {roomId && (
          <div className="p-2 sm:p-3 border-b bg-muted/20">
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {/* Order Creation */}
              <OrderForm
                roomId={roomId}
                onOrderCreated={onOrderCreated}
              />

              {/* Other Quick Actions - Add Note / Escalate hidden (were for testing) */}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-3 flex gap-2 items-end">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-full bg-muted px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 max-h-24 min-h-[40px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim()}
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetail
        order={selectedOrder || null}
        open={!!selectedOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrderId(null);
          }
        }}
      />
    </div>
  );
}
