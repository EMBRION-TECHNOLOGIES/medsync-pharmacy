/**
 * System Message Card Component for Gifted Chat (Web)
 * Renders system messages (OTP, delivery confirmation, dispatch notifications)
 */

import React from 'react';
import { IMessage } from 'react-web-gifted-chat';
import { cn } from '@/lib/utils';

interface SystemMessageCardProps {
  message: IMessage;
}

export const SystemMessageCard: React.FC<SystemMessageCardProps> = ({ message }) => {
  const text = message.text || '';
  const isOTPMessage = text.includes('delivery OTP');
  const isDeliveryConfirmation = text.includes('Delivery verified') || text.includes('Thank you for using');
  const isDispatchNotification = text.includes('Dispatch booked');

  if (!isOTPMessage && !isDeliveryConfirmation && !isDispatchNotification) {
    return null;
  }

  let badgeText = '🤖 TERASYNC SYSTEM';
  let cardBg = 'bg-amber-100 dark:bg-amber-900/40';
  let textColor = 'text-amber-900 dark:text-amber-100';
  let badgeColor = 'text-amber-700 dark:text-amber-300';

  if (isDispatchNotification) {
    badgeText = '📦 TERASYNC DISPATCH';
    cardBg = 'bg-blue-100 dark:bg-blue-900/40';
    textColor = 'text-blue-900 dark:text-blue-100';
    badgeColor = 'text-blue-700 dark:text-blue-300';
  } else if (isDeliveryConfirmation) {
    badgeText = '✅ TERASYNC SYSTEM';
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
        <p className="text-sm font-medium leading-relaxed">{text}</p>
      </div>
    </div>
  );
};
