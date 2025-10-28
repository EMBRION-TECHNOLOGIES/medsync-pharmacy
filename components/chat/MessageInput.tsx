'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, AlertTriangle, Package } from 'lucide-react';
import { OrderForm } from './OrderForm';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  onQuickAction?: (action: 'note' | 'escalate') => void;
  roomId?: string;
  onTyping?: (isTyping: boolean) => void;
  onOrderCreated?: (orderId: string) => void;
}

export function MessageInput({ onSend, disabled, onQuickAction, roomId, onTyping, onOrderCreated }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (roomId && onTyping) {
      // Start typing
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping(true);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping(false);
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      
      // Stop typing indicator
      if (roomId && onTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        isTypingRef.current = false;
        onTyping(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const quickActions = [
    {
      action: 'note' as const,
      icon: FileText,
      label: 'Add Note',
      color: 'text-ms-blue hover:text-ms-blue/80',
    },
    {
      action: 'escalate' as const,
      icon: AlertTriangle,
      label: 'Escalate',
      color: 'text-red-500 hover:text-red-600',
    },
  ];

  return (
    <div className="border-t">
      {/* Quick Actions */}
      <div className="p-3 border-b bg-muted/20">
        <div className="flex gap-2">
          {/* Order Creation */}
          {roomId && (
            <OrderForm 
              roomId={roomId} 
              onOrderCreated={onOrderCreated}
            />
          )}
          
          {/* Other Quick Actions */}
          {quickActions.map((action) => (
            <Button
              key={action.action}
              variant="ghost"
              size="sm"
              onClick={() => onQuickAction?.(action.action)}
              className={`flex items-center gap-2 ${action.color}`}
              disabled={disabled}
            >
              <action.icon className="h-4 w-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={disabled}
            className="min-h-[60px] resize-none"
          />
          <Button
            type="submit"
            disabled={!message.trim() || disabled}
            className="bg-ms-green hover:bg-ms-green/90"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

