# Backend Coordination Requirements for Socket Sanitization

## 🎯 **Overview**

The MedSync Pharmacy Web App has been updated to use canonical socket contracts. This document outlines the backend requirements to support the migration with zero downtime.

## 📋 **Current Status**

### ✅ **Frontend Ready**
- New socket service with canonical contracts implemented
- Feature flags configured for gradual migration
- Legacy event support enabled during transition
- All pages updated to use new socket hooks

### 🔄 **Backend Requirements**

## 1. **Dual Namespace Support**

### **Current State**
- Frontend connects to: `http://192.168.1.97:3000/patient-pharmacy`
- Legacy namespace: `http://192.168.1.97:3000/` (if currently used)

### **Required Implementation**
```javascript
// Backend should support both namespaces temporarily
io.of('/').on('connection', (socket) => {
  // Legacy namespace - emit both canonical and legacy events
});

io.of('/patient-pharmacy').on('connection', (socket) => {
  // New canonical namespace - emit only canonical events
});
```

### **Migration Timeline**
- **Week 1**: Backend implements dual namespace support
- **Week 2**: Frontend switches to `/patient-pharmacy` namespace
- **Week 3**: Backend removes legacy namespace support

## 2. **Canonical Socket Events**

### **Server → Client Events**
```javascript
// Canonical events (REQUIRED)
socket.emit('chat:message', {
  id: 'msg_123',
  roomId: 'room_456',
  senderId: 'user_789',
  senderType: 'patient' | 'pharmacy' | 'system',
  content: 'Hello world',
  messageType: 'TEXT' | 'IMAGE' | 'FILE',
  createdAt: '2024-12-20T10:30:00Z'
});

socket.emit('order:new', {
  id: 'order_123',
  drugName: 'Paracetamol',
  quantity: 2,
  status: 'PENDING',
  patient: { id: 'patient_456', phone: '+234...' },
  pharmacy: { id: 'pharmacy_789', name: 'MedSync Pharmacy' },
  createdAt: '2024-12-20T10:30:00Z'
});

socket.emit('order:updated', {
  id: 'order_123',
  status: 'CONFIRMED',
  updatedAt: '2024-12-20T10:35:00Z'
});

socket.emit('dispatch:updated', {
  dispatch: {
    id: 'dispatch_123',
    orderId: 'order_456',
    status: 'IN_TRANSIT',
    provider: 'kwik',
    trackingUrl: 'https://...',
    otp: '1234',
    updatedAt: '2024-12-20T10:40:00Z'
  }
});

socket.emit('chat:typing', {
  roomId: 'room_456',
  userId: 'user_789',
  isTyping: true
});
```

### **Client → Server Events**
```javascript
// Room management
socket.emit('join', { room: 'pharmacy:pharmacy_123' });
socket.emit('leave', { room: 'pharmacy:pharmacy_123' });

// Chat room management
socket.emit('chat:join', { roomId: 'room_456' });
socket.emit('chat:leave', { roomId: 'room_456' });

// Typing indicators
socket.emit('chat:typing', { roomId: 'room_456', isTyping: true });
```

## 3. **Legacy Event Support (Temporary)**

### **During Migration Period**
Backend should emit both canonical and legacy events to ensure compatibility:

```javascript
// When sending a chat message
socket.emit('chat:message', messageData); // Canonical
socket.emit('new-message', messageData);  // Legacy alias

// When order is created
socket.emit('order:new', orderData);      // Canonical
socket.emit('order:created', orderData);  // Legacy alias

// When order is updated
socket.emit('order:updated', orderData);  // Canonical
socket.emit('order:status-updated', orderData); // Legacy alias

// When dispatch is updated
socket.emit('dispatch:updated', dispatchData); // Canonical
socket.emit('dispatch:update', dispatchData);  // Legacy alias
socket.emit('delivery:status_changed', dispatchData); // Legacy alias
socket.emit('delivery:completed', dispatchData); // Legacy alias
```

## 4. **Room Management**

### **Room Naming Convention**
```javascript
// Pharmacy rooms
'pharmacy:{pharmacyId}'

// Chat rooms  
'chat:{roomId}'

// Dispatch rooms
'dispatch:{dispatchId}'
```

### **Room Join/Leave Protocol**
```javascript
// Join pharmacy room
socket.emit('join', { room: 'pharmacy:pharmacy_123' });

// Join chat room
socket.emit('chat:join', { roomId: 'room_456' });

// Join dispatch room
socket.emit('join', { room: 'dispatch:dispatch_789' });

// Leave any room
socket.emit('leave', { room: 'pharmacy:pharmacy_123' });
socket.emit('chat:leave', { roomId: 'room_456' });
```

## 5. **Authentication**

### **JWT Token Validation**
```javascript
// Socket connection with JWT
const socket = io('/patient-pharmacy', {
  auth: { token: 'jwt_token_here' }
});

// Backend should validate JWT and extract user/pharmacy info
socket.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  const user = validateJWT(token);
  const pharmacyId = user.pharmacyId;
  
  // Auto-join pharmacy room
  socket.join(`pharmacy:${pharmacyId}`);
});
```

## 6. **Error Handling**

### **Connection Errors**
```javascript
// Handle authentication errors
socket.on('connect_error', (error) => {
  if (error.message.includes('Authentication')) {
    // Redirect to login
  }
});

// Handle reconnection
socket.on('reconnect', () => {
  // Rejoin rooms
});
```

## 📊 **Testing Checklist**

### **Backend Team Testing**
- [ ] Dual namespace support working
- [ ] Canonical events being emitted correctly
- [ ] Legacy events still working (during migration)
- [ ] Room join/leave functionality
- [ ] JWT authentication working
- [ ] Typing indicators working
- [ ] Error handling for invalid tokens

### **Frontend Team Testing**
- [ ] Socket connects to correct namespace
- [ ] Real-time updates working
- [ ] Room management working
- [ ] Typing indicators working
- [ ] Connection status showing correctly
- [ ] Reconnection working
- [ ] No duplicate events

## 🚀 **Migration Steps**

### **Step 1: Backend Implementation (Week 1)**
1. Implement dual namespace support
2. Add canonical event emission
3. Keep legacy events for compatibility
4. Test with frontend team

### **Step 2: Frontend Migration (Week 2)**
1. Flip `NEXT_PUBLIC_SOCKET_NAMESPACE` to `/patient-pharmacy`
2. Set `NEXT_PUBLIC_ENABLE_LEGACY_EVENTS=false`
3. Deploy to production
4. Monitor for 24 hours

### **Step 3: Backend Cleanup (Week 3)**
1. Remove legacy event emission
2. Remove legacy namespace support
3. Clean up unused code

## 📞 **Coordination Points**

### **Backend Team Actions Required**
1. **Implement dual namespace support** - Support both `/` and `/patient-pharmacy`
2. **Add canonical events** - Emit `chat:message`, `order:new`, `order:updated`, `dispatch:updated`
3. **Maintain legacy events** - Keep `new-message`, `order:created`, etc. during migration
4. **Update room management** - Support new room naming convention
5. **Test authentication** - Ensure JWT validation works with new namespace

### **Frontend Team Actions Completed**
1. ✅ **New socket service** - Implemented with canonical contracts
2. ✅ **Feature flags** - Environment-based migration toggles
3. ✅ **Legacy support** - Temporary compatibility with old events
4. ✅ **Room management** - Proper join/leave hygiene
5. ✅ **Error handling** - Connection status and reconnection

## 🎯 **Success Criteria**

### **Technical Success**
- [ ] Zero downtime during migration
- [ ] All real-time features working
- [ ] No duplicate events
- [ ] Proper room isolation
- [ ] Authentication working correctly

### **User Experience Success**
- [ ] No user-reported issues
- [ ] Real-time updates seamless
- [ ] Connection status accurate
- [ ] Typing indicators working
- [ ] Chat responsiveness maintained

## 📋 **Next Steps**

1. **Backend team reviews this document**
2. **Backend team implements dual namespace support**
3. **Frontend team tests with backend changes**
4. **Coordinate production migration timing**
5. **Execute migration with monitoring**
6. **Clean up legacy code after successful migration**

---

**Contact**: Development Team  
**Last Updated**: December 2024  
**Status**: Ready for Backend Implementation
