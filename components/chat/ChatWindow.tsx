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

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

    // Check if message is an order status update
    if (message.content.includes('[ORDER_STATUS]')) {
      const orderData = JSON.parse(message.content.replace('[ORDER_STATUS]', ''));
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            <span>Order Update</span>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Order #{orderData.orderId}</span>
              <Badge variant={orderData.status === 'paid' ? 'default' : 'secondary'}>
                {orderData.status}
              </Badge>
            </div>
            {orderData.status === 'paid' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-ms-green">
                <CirclePoundSterling className="h-4 w-4" />
                <span>Payment received - Ready to pack</span>
              </div>
            )}
          </div>
        </div>
      );
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
        {sortedMessages.map((message: any) => {
          // Infer sender type if undefined (backend issue)
          // Check if message has userId or senderId, and if it matches current user
          const messageUserId = message.userId || message.senderId;
          const currentUserId = (user as any)?.id;
          const isPharmacy = message.senderType === 'pharmacy' || 
                            message.senderType === 'PHARMACY' ||
                            (message.senderType === undefined && messageUserId === currentUserId);
          const isSystem = message.senderType === 'system' || message.senderType === 'SYSTEM';

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
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
                    'rounded-lg px-4 py-2 max-w-[85%] md:max-w-[80%] lg:max-w-[70%] break-words inline-block',
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
          );
        })}
      </div>
    </div>
  );
}

