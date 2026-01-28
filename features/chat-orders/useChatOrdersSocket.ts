import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/lib/socketService';
import { useAuth } from '@/features/auth/hooks';
import { useOrg } from '@/store/useOrg';
import { chatOrdersService } from './service';

export function useChatOrdersSocket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pharmacyId } = useOrg();

  // Use singleton socket service instead of creating new instances
  const socket = socketService;

  // Only connect socket for pharmacy roles (PHARMACY_OWNER, PHARMACIST)
  // Admins don't need pharmacy socket connections
  const isPharmacyRole = user?.role === 'PHARMACY_OWNER' || user?.role === 'PHARMACIST';
  const shouldConnect = isPharmacyRole && (user?.pharmacyId || pharmacyId);

  useEffect(() => {
    // Don't connect for admins or if no pharmacyId
    if (!shouldConnect || !pharmacyId) {
      // If socket is connected but shouldn't be, disconnect it
      if (socket.isConnected()) {
        console.log('🔌 Disconnecting socket - user is admin or no pharmacyId');
        socket.disconnect();
      }
      return;
    }

    const getToken = () => {
      return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    };

    // Capture current values to use in callbacks
    const currentPharmacyId = pharmacyId;
    const currentIsPharmacyRole = isPharmacyRole;
    const currentUserRole = user?.role;

    socket.connect(getToken, {
      onConnect: () => {
        console.log('🎉 onConnect callback triggered!');
        console.log('pharmacyId:', currentPharmacyId);
        console.log('user role:', currentUserRole);
        
        // Double-check we have pharmacyId and are pharmacy role before joining
        if (currentPharmacyId && currentIsPharmacyRole) {
          console.log('✅ Joining pharmacy room:', currentPharmacyId);
          socket.joinPharmacy(currentPharmacyId);
          console.log(`✅ Pharmacy room joined. Listening for messages to pharmacy:${currentPharmacyId}`);
        } else {
          console.warn('⚠️ Cannot join pharmacy room - missing pharmacyId or not pharmacy role', {
            pharmacyId: currentPharmacyId,
            role: currentUserRole,
            isPharmacyRole: currentIsPharmacyRole
          });
          // Disconnect if we shouldn't be connected
          if (!currentIsPharmacyRole || !currentPharmacyId) {
            console.log('🔌 Disconnecting socket - invalid state for pharmacy connection');
            socket.disconnect();
          }
        }
      },
      onDisconnect: () => {
        console.log('Socket disconnected');
      },
      onChatMessage: (message) => {
        console.log('📨 Message received:', message.content);
        
        const messageData = message.message || message;
        const roomId = messageData.roomId;
        
        if (!roomId) {
          console.error('No roomId in message');
          return;
        }
        
        console.log('Updating cache for roomId:', roomId);
        
        // Update messages cache
        queryClient.setQueriesData({ queryKey: ['messages'], predicate: (query) => query.queryKey[1] === roomId }, (old: any) => {
          const existing = old?.messages?.find((m: any) => m.id === messageData.id);
          if (existing) return old;
          
          if (!old) {
            return { messages: [messageData] };
          }
          
          return { ...old, messages: [...(old.messages || []), messageData] };
        });
        
        // Update chat list - ADD ROOM IF IT DOESN'T EXIST
        queryClient.setQueriesData({ queryKey: ['chat-orders', { scope: 'pharmacy', pharmacyId }] }, (old: any) => {
          if (!old) {
            console.log('No chat-orders cache, creating new one with room');
            return { 
              rooms: [{
                id: roomId,
                lastMessage: messageData,
                unreadCount: 1,
                updatedAt: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
                participants: [
                  { id: messageData.senderId, type: 'patient', name: messageData.senderName || 'Patient' }
                ]
              }],
              orders: [],
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1
            };
          }
          
          // Check if room exists
          const existingRoom = old.rooms?.find((r: any) => r.id === roomId);
          
          if (!existingRoom) {
            // Room doesn't exist - add it
            console.log('Adding new room to list:', roomId);
            const newRoom = {
              id: roomId,
              lastMessage: messageData,
              unreadCount: 1,
              updatedAt: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
              participants: [
                { id: messageData.senderId, type: 'PATIENT', name: messageData.senderName || 'Patient' }
              ]
            };
            
            return {
              ...old,
              rooms: [newRoom, ...(old.rooms || [])],
              total: (old.total || 0) + 1
            };
          }
          
          // Room exists - update it
          const rooms = old.rooms.map((room: any) => {
            if (room.id === roomId) {
              return {
                ...room,
                lastMessage: messageData,
                unreadCount: (room.unreadCount || 0) + 1,
                updatedAt: messageData.timestamp || messageData.createdAt || new Date().toISOString()
              };
            }
            return room;
          });
          
          // Sort by updatedAt (most recent first)
          rooms.sort((a: any, b: any) => 
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
          
          return { ...old, rooms };
        });
        
        console.log('✅ Cache updated for room:', roomId);
      },
      onOrderNew: (order) => {
        console.log('🎉 NEW ORDER EVENT RECEIVED:', order);
        console.log('PharmacyId:', pharmacyId);
        
        // Add to orders list or refetch
        queryClient.invalidateQueries({ queryKey: ['chat-orders', { scope: 'pharmacy', pharmacyId }] });
        queryClient.invalidateQueries({ queryKey: ['orders', pharmacyId] });
        
        console.log('✅ Cache invalidated for new order');
        
        // Show notification
        if (typeof window !== 'undefined') {
          // You can add toast notification here if needed
          console.log('New order received:', order);
        }
      },
      onOrderUpdated: (order) => {
        console.log('Processing order update:', order);
        
        // Update specific order cache if it exists
        if (order.id || order.orderId) {
          const orderId = order.id || order.orderId;
          queryClient.setQueryData(['order', orderId], order);
        }
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['orders', pharmacyId] });
        queryClient.invalidateQueries({ queryKey: ['chat-orders', { scope: 'pharmacy', pharmacyId }] });
        queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
        
        // 🔥 CRITICAL: Invalidate financials when order status changes (especially DELIVERED)
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        queryClient.invalidateQueries({ queryKey: ['financials-transactions'] });
      },
      onDispatchUpdated: (dispatch) => {
        console.log('Processing dispatch update:', dispatch);
        
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatOrdersSocket.ts:onDispatchUpdated:ENTRY',message:'Socket dispatch update received',data:{dispatchId:dispatch.dispatch?.id||dispatch.dispatchId,status:dispatch.dispatch?.status||dispatch.dispatchStatus,hasDispatch:!!dispatch.dispatch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
        
        // Update specific dispatch query if you have it
        if (dispatch.dispatch?.id || dispatch.dispatchId) {
          const dispatchId = dispatch.dispatch?.id || dispatch.dispatchId;
          queryClient.setQueryData(['dispatch', dispatchId], dispatch.dispatch || dispatch);
        }
        
        // 🔥 CRITICAL: Invalidate ALL dispatch-related queries to ensure UI updates
        // This includes both active dispatches AND history
        queryClient.invalidateQueries({ queryKey: ['dispatch'] }); // All dispatch queries
        queryClient.invalidateQueries({ queryKey: ['dispatch-requests'] }); // Active dispatches
        queryClient.invalidateQueries({ queryKey: ['dispatch', 'history'] }); // History (DELIVERED/CANCELED)
        queryClient.invalidateQueries({ queryKey: ['dispatch-history'] }); // Legacy key
        
        // #region agent log
        if (typeof window !== 'undefined') {
          const cache = queryClient.getQueryCache();
          const historyQueries = cache.findAll({ queryKey: ['dispatch', 'history'] });
          fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatOrdersSocket.ts:onDispatchUpdated:INVALIDATED',message:'Queries invalidated',data:{historyQueriesFound:historyQueries.length,queryKeys:historyQueries.map(q=>q.queryKey)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,F'})}).catch(()=>{});
        }
        // #endregion
        
        // Also invalidate chat-orders as dispatch updates might affect order status
        queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
        
        // 🔥 CRITICAL: Invalidate financials when dispatch status changes (especially DELIVERED)
        // This ensures financials update when order is delivered
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        queryClient.invalidateQueries({ queryKey: ['financials-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['orders', pharmacyId] });
      },
      onTyping: (typing) => {
        console.log('Typing indicator:', typing);
        // You can implement typing indicators here if needed
        // For now, just log it
      },
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, [shouldConnect, pharmacyId, queryClient, socket, user?.role, user?.pharmacyId]);

  return socket;
}

const CHAT_ROOM_JOIN_RETRY_MS = 500;
const CHAT_ROOM_JOIN_MAX_ATTEMPTS = 24; // 12 seconds total

// Hook for individual chat room subscriptions
export function useChatRoomSocket(roomId?: string) {
  const socket = useChatOrdersSocket();

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let retryInterval: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    let connectUnsubscribe: (() => void) | null = null;

    const clearRetry = () => {
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
    };

    const tryJoin = () => {
      if (socket.isConnected()) {
        console.log('🔵 Joining chat room:', roomId);
        socket.joinChat(roomId);
        clearRetry();
        connectUnsubscribe?.();
        connectUnsubscribe = null;
        return true;
      }
      return false;
    };

    if (tryJoin()) {
      // Already connected
    } else {
      // Subscribe to connect so we join as soon as socket connects
      const rawSocket = socket.getSocket();
      if (rawSocket) {
        const onConnect = () => tryJoin();
        rawSocket.once('connect', onConnect);
        connectUnsubscribe = () => rawSocket.off('connect', onConnect);
      }

      // Fallback: poll in case connect event order or timing is off
      console.log('⏳ Socket not connected yet, will retry until connected…');
      retryInterval = setInterval(() => {
        attempts += 1;
        if (tryJoin()) return;
        if (attempts >= CHAT_ROOM_JOIN_MAX_ATTEMPTS) {
          console.warn('⚠️ Socket did not connect in time; chat room join skipped for', roomId);
          clearRetry();
          connectUnsubscribe?.();
          connectUnsubscribe = null;
        }
      }, CHAT_ROOM_JOIN_RETRY_MS);
    }

    return () => {
      clearRetry();
      connectUnsubscribe?.();
      console.log('🔴 Leaving chat room:', roomId);
      socket.leaveChat(roomId);
    };
  }, [roomId, socket]);

  return socket;
}

// Hook for dispatch tracking subscriptions
export function useDispatchSocket(dispatchId?: string) {
  const socket = useChatOrdersSocket();

  useEffect(() => {
    if (!dispatchId) return;

    console.log('Joining dispatch room:', dispatchId);
    socket.joinDispatch(dispatchId);

    return () => {
      console.log('Leaving dispatch room:', dispatchId);
      socket.leaveDispatch(dispatchId);
    };
  }, [dispatchId, socket]);

  return socket;
}
