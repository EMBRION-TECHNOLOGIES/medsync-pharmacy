/**
 * Order Status Card Component for Gifted Chat (Web)
 * Renders order status updates as custom cards
 */

import React from 'react';
import { IMessage } from 'react-web-gifted-chat';
import { cn } from '@/lib/utils';

interface OrderStatusData {
  status: string;
  orderId: string;
  orderCode: string;
  dispatchId?: string;
  timestamp: string;
}

interface OrderStatusCardProps {
  message: IMessage;
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({ message }) => {
  const orderData = parseOrderStatus(message.text);
  
  if (!orderData) {
    return null;
  }

  const status = (orderData.status || '').toLowerCase();
  
  const statusConfig: Record<string, any> = {
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
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const isDeliveryStatus = ['out_for_delivery', 'dispensed', 'delivered'].includes(status);
  
  return (
    <div className="w-full max-w-sm sm:max-w-md">
      <div className={cn("rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-2.5 border-2", config.bgColor, config.textColor)}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <span className="font-semibold">{config.label}</span>
        </div>
        
        <div className={cn("font-mono text-sm font-medium", config.accentColor)}>
          {orderData.orderCode}
        </div>
        
        {isDeliveryStatus && orderData.dispatchId ? (
          <button 
            onClick={() => window.location.href = `/orders/${orderData.orderId}`}
            className={cn(
              "w-full mt-2 px-4 py-2.5 rounded-md font-medium transition-colors",
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
            className={cn("text-sm font-medium hover:underline py-1", config.accentColor)}
          >
            View Full Details →
          </button>
        )}
      </div>
    </div>
  );
};

function parseOrderStatus(text: string): OrderStatusData | null {
  if (!text.includes('[ORDER_STATUS]')) {
    return null;
  }
  
  try {
    const jsonString = text.replace('[ORDER_STATUS]', '').trim();
    return JSON.parse(jsonString) as OrderStatusData;
  } catch (e) {
    console.error('Failed to parse ORDER_STATUS:', e);
    return null;
  }
}
