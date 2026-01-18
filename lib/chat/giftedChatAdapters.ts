/**
 * Gifted Chat Message Adapters for Web (Pharmacy Portal)
 * Transform between pharmacy portal message formats and react-web-gifted-chat IMessage format
 */

import { IMessage, User } from 'react-web-gifted-chat';
import type { ChatMessage } from '../zod-schemas';

/**
 * Transform Pharmacy Portal Chat message to Gifted Chat format
 */
export function transformPharmacyMessageToGifted(
  message: ChatMessage,
  currentUserId: string,
  patientUserId: string = 'patient'
): IMessage {
  const isPharmacy = message.senderType === 'pharmacy' || message.senderId === currentUserId;
  const isSystem = message.senderType === 'system' || message.senderType === 'SYSTEM';
  
  // Determine user object
  let user: User;
  if (isSystem) {
    user = {
      _id: 'system',
      name: 'System',
    };
  } else if (isPharmacy) {
    user = {
      _id: currentUserId,
      name: 'Pharmacy',
    };
  } else {
    user = {
      _id: message.senderId || patientUserId,
      name: 'Patient',
    };
  }
  
  return {
    _id: message.id,
    text: message.content || '',
    createdAt: new Date(message.createdAt),
    user,
    // Store custom data for rendering (cast to any to avoid type issues)
    customData: {
      messageType: message.messageType,
      senderId: message.senderId,
      senderType: message.senderType,
      roomId: message.roomId,
    } as any,
  };
}

/**
 * Transform Gifted Chat message back to Pharmacy Portal Chat format
 */
export function transformGiftedToPharmacyMessage(
  giftedMessage: IMessage,
  currentUserId: string,
  roomId: string
): { content: string; messageType?: 'TEXT' | 'IMAGE' | 'FILE' } {
  return {
    content: giftedMessage.text,
    messageType: (giftedMessage.customData as any)?.messageType || 'TEXT',
  };
}

/**
 * Transform array of Pharmacy messages to Gifted Chat format
 * Gifted Chat expects newest-first, so we reverse the array
 */
export function transformPharmacyMessagesToGifted(
  messages: ChatMessage[],
  currentUserId: string,
  patientUserId?: string
): IMessage[] {
  // Reverse to newest-first (Gifted Chat format)
  return messages
    .slice()
    .reverse()
    .map(msg => transformPharmacyMessageToGifted(msg, currentUserId, patientUserId));
}
