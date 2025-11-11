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
        if (order.id) {
          queryClient.setQueryData(['order', order.id], order);
        }
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['orders', pharmacyId] });
        queryClient.invalidateQueries({ queryKey: ['chat-orders', { scope: 'pharmacy', pharmacyId }] });
        queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
      },
      onDispatchUpdated: (dispatch) => {
        console.log('Processing dispatch update:', dispatch);
        
        // Update specific dispatch query if you have it
        if (dispatch.dispatch?.id) {
          queryClient.setQueryData(['dispatch', dispatch.dispatch.id], dispatch.dispatch);
        }
        
        // Invalidate dispatch-related queries
        queryClient.invalidateQueries({ queryKey: ['dispatch'] });
        queryClient.invalidateQueries({ queryKey: ['dispatch-requests'] });
        queryClient.invalidateQueries({ queryKey: ['dispatch-history'] });
        
        // Also invalidate chat-orders as dispatch updates might affect order status
        queryClient.invalidateQueries({ queryKey: ['chat-orders'] });
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

// Hook for individual chat room subscriptions
export function useChatRoomSocket(roomId?: string) {
  const socket = useChatOrdersSocket();

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let retryTimer: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before joining
    if (socket.isConnected()) {
      console.log('🔵 Joining chat room:', roomId);
      socket.joinChat(roomId);
    } else {
      console.log('⏳ Socket not connected yet, waiting...');
      // Retry after a short delay
      retryTimer = setTimeout(() => {
        if (socket.isConnected()) {
          console.log('🔵 Joining chat room (retry):', roomId);
          socket.joinChat(roomId);
        } else {
          console.error('❌ Socket still not connected after retry');
        }
      }, 1000);
    }
    
    // Leave room on cleanup
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
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
