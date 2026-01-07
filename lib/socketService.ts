import { io, Socket } from 'socket.io-client';

const NAMESPACE = process.env.NEXT_PUBLIC_SOCKET_NAMESPACE || '/';

type Handlers = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onChatMessage?: (m: any) => void;
  onOrderNew?: (o: any) => void;
  onOrderUpdated?: (o: any) => void;
  onDispatchUpdated?: (d: any) => void;
  onTyping?: (t: { roomId: string; userId: string; isTyping: boolean }) => void;
};

export class SocketService {
  private socket: Socket | null = null;
  private pharmacyRoomId: string | null = null;
  private joinedChatRooms = new Set<string>();
  private joinedDispatchRooms = new Set<string>();
  private joinedOrderRooms = new Set<string>();
  private handlers: Handlers = {};

  connect(getToken: () => string | null, handlers: Handlers = {}, forceReconnect = false) {
    // If socket is already connected and not forcing reconnect, just update handlers and return
    if (this.socket?.connected && !forceReconnect) {
      console.log('Socket already connected, updating handlers');
      this.handlers = { ...this.handlers, ...handlers };
      return;
    }
    
    // If forcing reconnect or socket exists but not connected, disconnect it first
    if (forceReconnect || (this.socket && !this.socket.connected)) {
      console.log('Cleaning up existing socket before connecting');
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }
      this.socket = null;
    }
    
    // Merge handlers instead of replacing
    this.handlers = { ...this.handlers, ...handlers };

    // Build socket URL with namespace
    const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    const socketUrl = `${baseUrl}${NAMESPACE}`;
    console.log('🔌 Connecting to Socket.IO:', socketUrl);

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token: getToken() || '' },
      reconnection: true,
      reconnectionAttempts: 8,
      autoConnect: false,
    });

    const s = this.socket;

    s.on('connect', () => {
      console.log('✅✅✅ CONNECTED to TeraSync socket server', NAMESPACE);
      console.log('Socket ID:', s.id);
      console.log('Calling onConnect handler...');
      this.handlers.onConnect?.();
      console.log('onConnect handler called');
    });

    s.on('disconnect', () => {
      console.log('Disconnected from TeraSync socket server');
      this.handlers.onDisconnect?.();
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    });

    // Canonical events
    s.on('chat:message', (m) => {
      this.handlers.onChatMessage?.(m);
    });

    s.on('order:new', (o) => {
      console.log('New order:', o);
      this.handlers.onOrderNew?.(o);
    });

    s.on('order:updated', (o) => {
      console.log('Order updated:', o);
      this.handlers.onOrderUpdated?.(o);
    });

    s.on('dispatch:updated', (d) => {
      console.log('Dispatch updated:', d);
      this.handlers.onDispatchUpdated?.(d);
    });

    // Consolidated camel-cased events (preferred)
    s.on('order.updated', (o) => {
      console.log('Order updated (consolidated):', o);
      this.handlers.onOrderUpdated?.(o);
    });

    s.on('chat:typing', (t) => {
      console.log('Typing indicator:', t);
      this.handlers.onTyping?.(t);
    });


    // Temporary legacy support (turn off via env)
    if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_EVENTS === 'true') {
      console.log('Legacy events enabled');
      
      s.on('new-message', (m) => {
        console.log('Legacy new-message event:', m);
        this.handlers.onChatMessage?.(m);
      });

      s.on('order:created', (o) => {
        console.log('Legacy order:created event:', o);
        this.handlers.onOrderNew?.(o);
      });

      s.on('order:status-updated', (o) => {
        console.log('Legacy order:status-updated event:', o);
        this.handlers.onOrderUpdated?.(o);
      });

      s.on('dispatch:update', (d) => {
        console.log('Legacy dispatch:update event:', d);
        this.handlers.onDispatchUpdated?.(d);
      });

      s.on('delivery:status_changed', (d) => {
        console.log('Legacy delivery:status_changed event:', d);
        this.handlers.onDispatchUpdated?.(d);
      });

      s.on('delivery:completed', (d) => {
        console.log('Legacy delivery:completed event:', d);
        this.handlers.onDispatchUpdated?.(d);
      });
    }

    // Connect the socket
    s.connect();
  }

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
    this.joinedChatRooms.clear();
    this.joinedDispatchRooms.clear();
    this.pharmacyRoomId = null;
  }

  joinPharmacy(pharmacyId: string) {
    const room = `pharmacy:${pharmacyId}`;
    if (room === this.pharmacyRoomId) return;
    
    if (this.pharmacyRoomId) {
      this.socket?.emit('leave', { room: this.pharmacyRoomId });
    }
    
    this.socket?.emit('join', { room });
    this.pharmacyRoomId = room;
    console.log(`Joined pharmacy room: ${room}`);
  }

  joinChat(roomId: string) {
    console.log('🔍 DEBUG joinChat called with roomId:', roomId);
    console.log('🔍 Socket exists?', !!this.socket);
    console.log('🔍 Socket connected?', this.socket?.connected);
    
    if (!this.socket?.connected) {
      console.error('❌ Cannot join chat room - socket not connected');
      return;
    }
    
    if (this.joinedChatRooms.has(roomId)) {
      console.log('Already joined chat room:', roomId);
      return;
    }
    
    console.log('📨 Emitting chat:join for roomId:', roomId);
    this.socket.emit('chat:join', { roomId });
    this.joinedChatRooms.add(roomId);
    console.log(`✅ Joined chat room: ${roomId}`);
    
    // Listen for confirmation
    this.socket.once('room-joined', (data: any) => {
      console.log('✅ Room join confirmed:', data);
    });
  }

  leaveChat(roomId: string) {
    if (!this.joinedChatRooms.has(roomId)) {
      console.log('Not in chat room:', roomId);
      return;
    }
    
    console.log('📨 Emitting chat:leave for roomId:', roomId);
    this.socket?.emit('chat:leave', { roomId });
    this.joinedChatRooms.delete(roomId);
    console.log(`✅ Left chat room: ${roomId}`);
  }

  joinDispatch(dispatchId: string) {
    const room = `dispatch:${dispatchId}`;
    if (this.joinedDispatchRooms.has(room)) return;
    
    this.socket?.emit('join', { room });
    this.joinedDispatchRooms.add(room);
    console.log(`Joined dispatch room: ${room}`);
  }

  leaveDispatch(dispatchId: string) {
    const room = `dispatch:${dispatchId}`;
    if (!this.joinedDispatchRooms.has(room)) return;
    
    this.socket?.emit('leave', { room });
    this.joinedDispatchRooms.delete(room);
    console.log(`Left dispatch room: ${room}`);
  }

  joinOrder(orderId: string) {
    const room = `order:${orderId}`;
    if (this.joinedOrderRooms.has(room)) return;

    this.socket?.emit('join', { room });
    this.joinedOrderRooms.add(room);
    console.log(`Joined order room: ${room}`);
  }

  leaveOrder(orderId: string) {
    const room = `order:${orderId}`;
    if (!this.joinedOrderRooms.has(room)) return;

    this.socket?.emit('leave', { room });
    this.joinedOrderRooms.delete(room);
    console.log(`Left order room: ${room}`);
  }

  sendTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { roomId, isTyping });
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  getSocket() {
    return this.socket;
  }

  getConnectedRooms() {
    return {
      pharmacy: this.pharmacyRoomId,
      chats: Array.from(this.joinedChatRooms),
      dispatches: Array.from(this.joinedDispatchRooms),
      orders: Array.from(this.joinedOrderRooms),
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();