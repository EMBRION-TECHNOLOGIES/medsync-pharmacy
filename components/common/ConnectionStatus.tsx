'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { socketService } from '@/lib/socketService';
import { useAuth } from '@/features/auth/hooks';
import { useOrg } from '@/store/useOrg';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { user } = useAuth();
  const { pharmacyId } = useOrg();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Only show connection status for pharmacy roles
  const isPharmacyRole = user?.role === 'PHARMACY_OWNER' || user?.role === 'PHARMACIST';
  const shouldShow = isPharmacyRole && !!pharmacyId;

  useEffect(() => {
    if (!shouldShow) {
      // Don't track connection for admins or users without pharmacyId
      setIsConnected(false);
      return;
    }

    // Check initial connection status
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
      if (!connected && isReconnecting) {
        setIsReconnecting(false);
      }
    };
    
    checkConnection();

    // Poll connection status periodically to catch state changes
    // This is needed because the hook manages the connection, not this component
    const interval = setInterval(checkConnection, 2000);

    // Also listen to socket events directly if socket exists
    const socket = socketService.getSocket();
    if (socket) {
      const handleConnect = () => {
        console.log('🔌 ConnectionStatus: Socket connected');
        setIsConnected(true);
        setIsReconnecting(false);
      };

      const handleDisconnect = () => {
        console.log('🔌 ConnectionStatus: Socket disconnected');
        setIsConnected(false);
        setIsReconnecting(false);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      return () => {
        clearInterval(interval);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    }

    return () => {
      clearInterval(interval);
    };
  }, [shouldShow, isReconnecting]);

  const handleReconnect = useCallback(() => {
    if (!shouldShow || !pharmacyId) return;
    
    console.log('🔄 Retry button clicked - forcing reconnection');
    setIsReconnecting(true);
    
    // Force disconnect first
    socketService.disconnect();
    
    // Wait a bit then reconnect
    setTimeout(() => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token && pharmacyId) {
        console.log('🔄 Attempting to reconnect socket...');
        // Force reconnect by passing true as third parameter
        (socketService as any).connect(() => token, {
          onConnect: () => {
            console.log('✅ Reconnection successful');
            setIsConnected(true);
            setIsReconnecting(false);
            // Join pharmacy room after connection
            socketService.joinPharmacy(pharmacyId);
          },
          onDisconnect: () => {
            console.log('❌ Reconnection failed - disconnected');
            setIsConnected(false);
            setIsReconnecting(false);
          },
        }, true); // Force reconnect
      } else {
        console.warn('⚠️ Cannot reconnect - missing token or pharmacyId');
        setIsReconnecting(false);
      }
    }, 500);
  }, [shouldShow, pharmacyId]);

  // Don't show connection status for admins or users without pharmacy
  if (!shouldShow) {
    return null;
  }

  if (isConnected) {
    return (
      <Badge variant="outline" className={`text-green-600 border-green-600 ${className}`}>
        <Wifi className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge variant="outline" className={`text-yellow-600 border-yellow-600 ${className}`}>
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        Reconnecting...
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className="text-red-600 border-red-600">
        <WifiOff className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleReconnect}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}
