# Testing Chat Integration - Step-by-Step Guide

## 🎯 OBJECTIVE

Verify that pharmacy web app can send and receive chat messages in real-time with patient mobile app.

---

## 📋 SETUP

### Prerequisites
- Backend running on: `http://192.168.1.97:3000`
- Web app running: `http://localhost:3000` (or your dev port)
- Mobile app installed and logged in as patient
- Pharmacy account logged in on web app

---

## 🧪 TEST 1: Pharmacy Receives Patient Message

### Steps:
1. Open pharmacy web app → Navigate to **Chat** page
2. Open browser DevTools Console (F12)
3. Select a chat thread with a patient
4. **Expected console logs**:
   ```
   🚀 Joining chat room: [roomId]
   Socket connected? true
   📨 Emitting chat:join for roomId: [roomId]
   ✅ Joined chat room: [roomId]
   ✅ Room join confirmed: { roomId: '...' }
   ```
5. From mobile app (patient), send a message
6. **Expected console logs**:
   ```
   📨 Received chat message from patient: { ... }
   🔄 Updating message cache for roomId: [roomId]
   ✅ Adding new message to cache: [messageId]
   ```
7. **Expected UI**: Message appears in chat window immediately

### ✅ PASS IF:
- Console shows `📨 Emitting chat:join`
- Console shows `📨 Received chat message from patient`
- Message appears in UI without page refresh

### ❌ FAIL IF:
- No `chat:join` emit logged
- No `chat:message` received (check backend logs)
- Message only appears after refresh

---

## 🧪 TEST 2: Patient Receives Pharmacy Message

### Steps:
1. Ensure pharmacy user has the chat thread open
2. Open browser DevTools Console
3. Type a message in pharmacy chat input
4. Click Send
5. **Expected console logs**:
   ```
   POST /api/v1/chat-orders/[roomId]/messages 200 OK
   📨 Received chat message from patient: { ... } (your own message echoed back)
   ```
6. Check mobile app (patient): Message should appear immediately

### ✅ PASS IF:
- Message sends successfully (200 response)
- Message appears in pharmacy UI
- Message appears in patient mobile app
- No duplicates

### ❌ FAIL IF:
- Send fails with error
- Message appears twice in UI (check for duplicate detection)
- Patient doesn't receive message

---

## 🧪 TEST 3: Multi-Staff Chat (If Multiple Pharmacists)

### Steps:
1. Login as Pharmacy User A → Open chat thread
2. Login as Pharmacy User B → Open **same** chat thread
3. From User B: Send a message
4. **Expected**: Both User A and B see the message

### ✅ PASS IF:
- All active pharmacy users receive the message
- No duplicates
- Message appears in correct thread

---

## 🧪 TEST 4: Chat Room Join/Leave Hygiene

### Steps:
1. Open chat thread A → Send message → Close thread (select different thread)
2. **Expected console logs**:
   ```
   👋 Leaving chat room: [threadA-roomId]
   🚀 Joining chat room: [threadB-roomId]
   ```
3. From mobile, send message to thread B
4. **Expected**: Message appears in pharmacy UI
5. From mobile, send message to thread A
6. **Expected**: Message does NOT appear (pharmacy left thread A)

### ✅ PASS IF:
- Leave/Join logs appear correctly
- Old messages don't leak into wrong threads
- Only current thread receives messages

---

## 🐛 DEBUGGING CHECKLIST

### If messages don't appear:

#### 1. Check Socket Connection
```javascript
// In browser console:
console.log('Socket connected?', /* check your socket service */)
```

**Expected**: `true`

**Fix**: Check authentication token, verify `NEXT_PUBLIC_SOCKET_URL` env var

#### 2. Check Room Join
Look for: `📨 Emitting chat:join for roomId: [id]`

**If missing**:
- Verify `selectedThread?.id` is defined in chat page
- Check `useChatRoomSocket` hook is being called

#### 3. Check Backend Logs
Look for:
```
[Pharmacy NS] User joined room:room:{roomId}
Sent chat:message to room:{roomId}
```

**If missing**:
- Backend not receiving `chat:join` emit
- Backend not emitting to correct room

#### 4. Check Message Structure
When message received, log it:
```javascript
console.log('Message structure:', message)
```

**Expected fields**:
- `id` (string)
- `content` (string)
- `roomId` (string)
- `senderId` (string)
- `timestamp` or `createdAt` (string)

---

## 📊 COMMON ISSUES

### Issue: "Cannot join chat room - socket not connected"
**Cause**: Socket not connected yet when trying to join
**Fix**: Ensure socket connects before joining rooms (already implemented in layout)

### Issue: "No roomId in message"
**Cause**: Backend message payload missing `roomId` field
**Fix**: Backend must include `roomId` in `chat:message` payload

### Issue: "Message already exists, skipping"
**Cause**: Message deduplication working (this is good!)
**Info**: This prevents duplicate messages from appearing twice

### Issue: Messages appear but after delay
**Cause**: Not receiving socket events, falling back to cache invalidation
**Fix**: Check backend is emitting to correct room and namespace

---

## ✅ FINAL VALIDATION

**All tests pass** when:
- ✅ Real-time bidirectional messaging works
- ✅ No message duplicates
- ✅ Join/Leave logs appear correctly
- ✅ No console errors (except expected deduplication logs)
- ✅ Messages persist after page refresh

---

**Testing Status**: Ready for backend verification

