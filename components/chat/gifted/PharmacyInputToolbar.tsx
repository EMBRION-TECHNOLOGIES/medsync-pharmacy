/**
 * Custom Input Toolbar for Pharmacy Chat (Web)
 * Includes quick actions (Order Form, Add Note, Escalate)
 */

import React from 'react';
import { InputToolbar, IMessage } from 'react-web-gifted-chat';
import { OrderForm } from '../OrderForm';
import { Button } from '@/components/ui/button';

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
            
            {/* Other Quick Actions - Add Note / Escalate hidden (were for testing) */}
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
