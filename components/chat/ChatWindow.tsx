'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/lib/zod-schemas';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageSquare, Package, Image, Eye, Clock, CirclePoundSterling } from 'lucide-react';
import { OCRPreview } from './OCRPreview';
import { useAuth } from '@/features/auth/hooks';

interface ChatWindowProps {
  messages: ChatMessage[];
  patientAlias?: string;
  threadId?: string;
  patientId?: string;
}

export function ChatWindow({ messages, patientId }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showOCRPreview, setShowOCRPreview] = useState(false);
  const [ocrImageUrl, setOcrImageUrl] = useState('');
  const { user } = useAuth();

  // Track the last message ID when chat was opened to determine "new" messages
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);

  // Set the last read message ID when messages first load
  useEffect(() => {
    if (messages.length > 0 && !lastReadMessageId) {
      // Find the last message that's from the patient (not pharmacy)
      const lastPatientMessage = messages
        .filter(m => {
          const messageUserId = (m as any).userId || (m as any).senderId;
          const currentUserId = (user as any)?.id;
          const isPharmacy = m.senderType === 'pharmacy' ||
                            m.senderType === 'PHARMACY' ||
                            (m.senderType === undefined && messageUserId === currentUserId);
          return !isPharmacy;
        })
        .pop();

      if (lastPatientMessage) {
        setLastReadMessageId(lastPatientMessage.id);
      }
    }
  }, [messages.length]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

      // After scrolling, mark all messages as read
      setTimeout(() => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          setLastReadMessageId(lastMessage.id);
        }
      }, 300);
    }
  }, [messages]);

  const handleAcceptOCR = (drugs: unknown[]) => {
    console.log('Accepting OCR drugs:', drugs);
    setShowOCRPreview(false);
    // Backend will automatically create quote based on OCR data
  };

  const handleRejectOCR = () => {
    setShowOCRPreview(false);
  };

  const handleEditOCR = (drugs: unknown[]) => {
    console.log('Editing OCR drugs:', drugs);
    setShowOCRPreview(false);
    // Backend will automatically create quote based on edited OCR data
  };

  const renderMessageContent = (message: ChatMessage): React.ReactNode => {
    // Check if message contains image (OCR scenario)
    if (message.content.includes('[IMAGE]')) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="h-4 w-4" />
            <span>Patient sent prescription image</span>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setOcrImageUrl('/api/placeholder/400/300'); // Mock image URL
              setShowOCRPreview(true);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Review with OCR
          </Button>
        </div>
      );
    }

    // Check if message is a quote
    if (message.content.includes('[QUOTE]')) {
      const quoteData = JSON.parse(message.content.replace('[QUOTE]', ''));
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            <span>Quote Sent</span>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            {quoteData.items?.map((item: { drugName: string; strength: string; quantity: number; totalPrice: number }, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.drugName} {item.strength} x{item.quantity}</span>
                <span>₦{item.totalPrice}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total:</span>
              <span>₦{quoteData.totalAmount}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Delivery: {quoteData.deliveryEstimate}</span>
            </div>
          </div>
        </div>
      );
    }

    // Check if message is a system notification (OTP, Dispatch, Thank You)
    if (message.messageType === 'SYSTEM' && !message.content.includes('[ORDER_STATUS]')) {
      const isOTPMessage = message.content.includes('delivery OTP');
      const isDeliveryConfirmation = message.content.includes('Delivery verified') || message.content.includes('Thank you for using');
      const isDispatchNotification = message.content.includes('Dispatch booked');

      if (isOTPMessage || isDeliveryConfirmation || isDispatchNotification) {
        let badgeText = '🤖 MEDSYNC SYSTEM';
        let cardBg = 'bg-amber-100 dark:bg-amber-900/40';
        let textColor = 'text-amber-900 dark:text-amber-100';
        let badgeColor = 'text-amber-700 dark:text-amber-300';

        if (isDispatchNotification) {
          badgeText = '📦 MEDSYNC DISPATCH';
          cardBg = 'bg-blue-100 dark:bg-blue-900/40';
          textColor = 'text-blue-900 dark:text-blue-100';
          badgeColor = 'text-blue-700 dark:text-blue-300';
        } else if (isDeliveryConfirmation) {
          badgeText = '✅ MEDSYNC SYSTEM';
          cardBg = 'bg-purple-100 dark:bg-purple-900/40';
          textColor = 'text-purple-900 dark:text-purple-100';
          badgeColor = 'text-purple-700 dark:text-purple-300';
        }

        return (
          <div className="w-full max-w-md mx-auto">
            <div className={cn("rounded-lg p-4 space-y-2 border-2", cardBg, textColor)}>
              <div className="pb-2 border-b border-current/10">
                <span className={cn("text-xs font-extrabold uppercase tracking-wider", badgeColor)}>
                  {badgeText}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{message.content}</p>
            </div>
          </div>
        );
      }
    }

    // Check if message is an order status update
    if (message.content.includes('[ORDER_STATUS]')) {
      try {
        const orderData = JSON.parse(message.content.replace('[ORDER_STATUS]', ''));
        const status = (orderData.status || '').toLowerCase();
        
        // Status configuration - matches mobile app exactly for 1:1 sync
        const statusConfig = {
          pending: {
            icon: '⏳',
            label: 'Order Pending',
            bgColor: 'bg-amber-100 dark:bg-amber-900/40',
            textColor: 'text-amber-900 dark:text-amber-100',
            accentColor: 'text-amber-700 dark:text-amber-300'
          },
          confirmed: {
            icon: '✅',
            label: 'Order Confirmed',
            bgColor: 'bg-green-100 dark:bg-green-900/40',
            textColor: 'text-green-900 dark:text-green-100',
            accentColor: 'text-green-700 dark:text-green-300'
          },
          preparing: {
            icon: '📦',
            label: 'Order Preparing',
            bgColor: 'bg-blue-100 dark:bg-blue-900/40',
            textColor: 'text-blue-900 dark:text-blue-100',
            accentColor: 'text-blue-700 dark:text-blue-300'
          },
          prepared: {
            icon: '📦',
            label: 'Order Ready',
            bgColor: 'bg-purple-100 dark:bg-purple-900/40',
            textColor: 'text-purple-900 dark:text-purple-100',
            accentColor: 'text-purple-700 dark:text-purple-300'
          },
          paid: {
            icon: '✅',
            label: 'Order Paid',
            bgColor: 'bg-green-100 dark:bg-green-900/40',
            textColor: 'text-green-900 dark:text-green-100',
            accentColor: 'text-green-700 dark:text-green-300'
          },
          driver_assigned: {
            icon: '🏍️',
            label: 'Rider Assigned',
            bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
            textColor: 'text-fuchsia-900 dark:text-fuchsia-100',
            accentColor: 'text-fuchsia-700 dark:text-fuchsia-300'
          },
          out_for_delivery: {
            icon: '🏍️',
            label: 'Rider On the Way',
            bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
            textColor: 'text-cyan-900 dark:text-cyan-100',
            accentColor: 'text-cyan-700 dark:text-cyan-300'
          },
          dispensed: {
            icon: '💊',
            label: 'Order Dispensed',
            bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
            textColor: 'text-indigo-900 dark:text-indigo-100',
            accentColor: 'text-indigo-700 dark:text-indigo-300'
          },
          delivered: {
            icon: '🎉',
            label: 'Order Delivered',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
            textColor: 'text-emerald-900 dark:text-emerald-100',
            accentColor: 'text-emerald-700 dark:text-emerald-300'
          },
          completed: {
            icon: '✅',
            label: 'Order Completed',
            bgColor: 'bg-green-100 dark:bg-green-900/40',
            textColor: 'text-green-900 dark:text-green-100',
            accentColor: 'text-green-700 dark:text-green-300'
          },
          cancelled: {
            icon: '❌',
            label: 'Order Cancelled',
            bgColor: 'bg-red-100 dark:bg-red-900/40',
            textColor: 'text-red-900 dark:text-red-100',
            accentColor: 'text-red-700 dark:text-red-300'
          }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || {
          icon: '📋',
          label: 'Order Updated',
          bgColor: 'bg-gray-100 dark:bg-gray-900/40',
          textColor: 'text-gray-900 dark:text-gray-100',
          accentColor: 'text-gray-700 dark:text-gray-300'
        };
        
        // Check if this is a delivery status that should be clickable
        const isDeliveryStatus = ['out_for_delivery', 'dispensed', 'delivered'].includes(status);
        const dispatchId = orderData.dispatchId;
        
        return (
          <div className="w-full max-w-sm">
            <div className={cn("rounded-lg p-4 space-y-2.5", config.bgColor, config.textColor)}>
              {/* Header with icon and status */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                <span className="font-semibold">{config.label}</span>
              </div>
              
              {/* Order Code - simple and readable */}
              <div className={cn("font-mono text-sm font-medium", config.accentColor)}>
                {orderData.orderCode}
              </div>
              
              {/* View Details Button/Link */}
              {isDeliveryStatus && dispatchId ? (
                <button 
                  onClick={() => window.location.href = `/orders/${orderData.orderId}`}
                  className={cn(
                    "w-full mt-2 px-4 py-2 rounded-md font-medium transition-colors",
                    "bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30",
                    "border border-current/20 hover:border-current/40",
                    config.textColor
                  )}
                >
                  📍 Track Delivery →
                </button>
              ) : (
                <button 
                  onClick={() => window.location.href = `/orders/${orderData.orderId}`}
                  className={cn("text-sm font-medium hover:underline", config.accentColor)}
                >
                  View Full Details →
                </button>
              )}
            </div>
          </div>
        );
      } catch (e) {
        return <p className="text-sm text-muted-foreground">Order status update</p>;
      }
    }

    // Regular text message
    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  if (showOCRPreview) {
    return (
      <div className="h-[calc(100vh-300px)] overflow-y-auto p-4">
        <OCRPreview
          imageUrl={ocrImageUrl}
          onAccept={handleAcceptOCR}
          onReject={handleRejectOCR}
          onEdit={handleEditOCR}
        />
      </div>
    );
  }

  // Quote builder removed - quotes are now automated by backend

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] text-muted-foreground">
        <div className="text-center space-y-4">
          <MessageSquare className="h-16 w-16 mx-auto opacity-50" />
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation</p>
          <div className="text-sm text-muted-foreground">
            Patient messages are processed automatically by the backend
          </div>
        </div>
      </div>
    );
  }

  /**
   * Format date separator like WhatsApp
   * - Today's messages → "Today"
   * - Yesterday's messages → "Yesterday"
   * - This week's messages → Day name (e.g., "Wednesday")
   * - Older → Full date (e.g., "11 December 2025")
   */
  const formatDateSeparator = (timestamp: string | Date) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to midnight for accurate date comparison
    const messageDateMidnight = new Date(messageDate);
    messageDateMidnight.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const yesterdayMidnight = new Date(yesterday);
    yesterdayMidnight.setHours(0, 0, 0, 0);

    // Check if message is from today
    if (messageDateMidnight.getTime() === todayMidnight.getTime()) {
      return 'Today';
    }

    // Check if message is from yesterday
    if (messageDateMidnight.getTime() === yesterdayMidnight.getTime()) {
      return 'Yesterday';
    }

    // Check if message is from this week (within last 7 days)
    const daysDiff = Math.floor((todayMidnight.getTime() - messageDateMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      // Return day name (e.g., "Monday", "Tuesday")
      return format(messageDate, 'EEEE');
    }

    // For older messages, return full date
    return format(messageDate, 'd MMMM yyyy');
  };

  /**
   * Check if we should show a date separator between two messages
   */
  const shouldShowDateSeparator = (currentMsg: ChatMessage, previousMsg?: ChatMessage) => {
    if (!previousMsg) return true; // Always show for first message

    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);

    // Compare dates (ignoring time)
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);

    return currentDate.getTime() !== previousDate.getTime();
  };

  // Sort messages by timestamp to ensure correct order
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  return (
    <div 
      ref={scrollRef} 
      className="h-[calc(100vh-300px)] overflow-y-auto p-4"
    >
      <div className="space-y-4">
        {sortedMessages.map((message: any, index: number) => {
          // Infer sender type if undefined (backend issue)
          // Check if message has userId or senderId, and if it matches current user
          const messageUserId = message.userId || message.senderId;
          const currentUserId = (user as any)?.id;
          const isPharmacy = message.senderType === 'pharmacy' ||
                            message.senderType === 'PHARMACY' ||
                            (message.senderType === undefined && messageUserId === currentUserId);
          const isSystem = message.senderType === 'system' || message.senderType === 'SYSTEM';

          // Check if we should show a date separator
          const previousMsg = index > 0 ? sortedMessages[index - 1] : undefined;
          const showDateSeparator = shouldShowDateSeparator(message, previousMsg);

          // Check if this is the first unread message (for "X new messages" indicator)
          let isFirstUnread = false;
          let unreadCount = 0;

          if (lastReadMessageId && !isPharmacy) {
            // Find the index of the last read message
            const lastReadIndex = sortedMessages.findIndex(m => m.id === lastReadMessageId);

            if (lastReadIndex !== -1 && index === lastReadIndex + 1) {
              // This is the first message after the last read message
              isFirstUnread = true;

              // Count unread messages (messages after lastReadMessageId from patient)
              unreadCount = sortedMessages
                .slice(lastReadIndex + 1)
                .filter(m => {
                  const mUserId = (m as any).userId || (m as any).senderId;
                  const mIsPharmacy = m.senderType === 'pharmacy' ||
                                     m.senderType === 'PHARMACY' ||
                                     (m.senderType === undefined && mUserId === currentUserId);
                  return !mIsPharmacy;
                }).length;
            }
          }

          return (
            <div key={message.id}>
              {/* Date Separator (WhatsApp-style) */}
              {showDateSeparator && (
                <div className="flex items-center justify-center mt-4 mb-2">
                  <div className="flex-1 h-px bg-border"></div>
                  <div className="px-3 py-1.5 mx-2 bg-muted rounded-full">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDateSeparator(message.createdAt)}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border"></div>
                </div>
              )}

              {/* New Messages Indicator (WhatsApp-style) */}
              {isFirstUnread && unreadCount > 0 && (
                <div className="flex items-center justify-center mt-4 mb-2">
                  <div className="flex-1 h-px bg-green-500"></div>
                  <div className="px-3 py-1.5 mx-2 bg-green-500 rounded-full">
                    <span className="text-xs font-bold text-white uppercase">
                      {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-green-500"></div>
                </div>
              )}

              {/* Message Content */}
              {isSystem ? (
                <div className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex gap-3',
                    isPharmacy ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* <Avatar className="h-8 w-8">
                    <AvatarFallback className={isPharmacy ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                      {isPharmacy ? 'P' : 'PT'}
                    </AvatarFallback>
                  </Avatar> */}
                  <div className={cn('flex flex-col w-full', isPharmacy ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2 max-w-[85%] md:max-w-[80%] lg:max-w-[70%] wrap-break-word inline-block',
                        isPharmacy
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {renderMessageContent(message)}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

