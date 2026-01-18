/**
 * Custom Input Toolbar for Pharmacy Chat (Web)
 * Includes quick actions (Order Form, Add Note, Escalate)
 */

import React from 'react';
import { InputToolbar, IMessage } from 'react-web-gifted-chat';
import { OrderForm } from '../OrderForm';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle } from 'lucide-react';

interface PharmacyInputToolbarProps {
  messages: IMessage[];
  text: string;
  user: any;
  onInputTextChanged: (text: string) => void;
  onSend: (messages: IMessage[]) => void;
  inputToolbarProps?: any;
  roomId?: string;
  onQuickAction?: (action: 'note' | 'escalate') => void;
  onOrderCreated?: (orderId: string) => void;
}

export const PharmacyInputToolbar: React.FC<PharmacyInputToolbarProps> = (props) => {
  const { roomId, onQuickAction, onOrderCreated, ...inputToolbarProps } = props;

  return (
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
            
            {/* Other Quick Actions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuickAction?.('note')}
              className="flex items-center gap-1 sm:gap-2 text-ms-blue hover:text-ms-blue/80 touch-manipulation min-h-[36px]"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Add Note</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuickAction?.('escalate')}
              className="flex items-center gap-1 sm:gap-2 text-red-500 hover:text-red-600 touch-manipulation min-h-[36px]"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Escalate</span>
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <InputToolbar
        {...inputToolbarProps}
        containerStyle={{
          padding: '8px 16px',
          backgroundColor: 'hsl(var(--background))',
          borderTop: 'none',
        }}
        primaryStyle={{
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '9999px',
          padding: '8px 16px',
          fontSize: '16px',
          maxHeight: '100px',
        }}
        textInputStyle={{
          fontSize: '16px',
          lineHeight: '20px',
        }}
        textInputProps={{
          placeholder: 'Type your message...',
          placeholderTextColor: 'hsl(var(--muted-foreground))',
          multiline: true,
        }}
      />
    </div>
  );
};
