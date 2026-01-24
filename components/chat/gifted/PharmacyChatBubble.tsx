/**
 * Custom Pharmacy Chat Bubble for Gifted Chat (Web)
 * Handles regular text messages and routes to custom renderers for special types
 */

import React from 'react';
import { Bubble, IMessage } from 'react-web-gifted-chat';
import { OrderStatusCard } from './OrderStatusCard';
import { SystemMessageCard } from './SystemMessageCard';

interface PharmacyChatBubbleProps {
  currentMessage?: IMessage;
  nextMessage?: IMessage;
  previousMessage?: IMessage;
  user: any;
  position: 'left' | 'right';
}

export const PharmacyChatBubble: React.FC<PharmacyChatBubbleProps> = (props) => {
  const { currentMessage, position } = props;
  
  if (!currentMessage) return null;

  const customData = (currentMessage as any)?.customData || {};
  const messageType = customData?.messageType || 'TEXT';
  const isSystem = messageType === 'SYSTEM' || customData?.senderType === 'system';
  const isOrder = currentMessage.text?.includes('[ORDER_STATUS]');

  // Route to custom renderers for special message types
  if (isOrder && currentMessage.text?.includes('[ORDER_STATUS]')) {
    return <OrderStatusCard message={currentMessage} />;
  }

  if (isSystem) {
    return <SystemMessageCard message={currentMessage} />;
  }

  // Regular text message
  return (
    <Bubble
      {...props}
      wrapperStyle={{
        left: {
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '8px',
          borderBottomLeftRadius: '4px',
        },
        right: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '8px',
          borderBottomRightRadius: '4px',
        },
      }}
      textStyle={{
        left: {
          color: 'hsl(var(--foreground))',
        },
        right: {
          color: 'hsl(var(--primary-foreground))',
        },
      }}
    />
  );
};
