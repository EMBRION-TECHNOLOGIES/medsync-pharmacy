'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { socketService } from '@/lib/socketService';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Check initial connection status
    setIsConnected(socketService.isConnected());

    // Listen for connection changes
    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsReconnecting(true);
    };

    // Set up socket event listeners
    socketService.connect(() => {
      return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    }, {
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
    });

    return () => {
      // Cleanup is handled by the socket service
    };
  }, []);

  const handleReconnect = () => {
    setIsReconnecting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      socketService.connect(() => token, {
        onConnect: () => {
          setIsConnected(true);
          setIsReconnecting(false);
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsReconnecting(false);
        },
      });
    }
  };

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
