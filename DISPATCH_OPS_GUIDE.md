# Dispatch & Order History Operations Guide

## Overview

This guide covers operations, troubleshooting, and failure handling for the dispatch and order history system in the MedSync Pharmacy Web application.

## Architecture

### Key Components
- **Frontend**: `/orders` page (list), `/orders/[orderId]` (detail)
- **Backend**: Unified `/api/v1/orders` endpoints, Kwik webhook receiver
- **Realtime**: Socket.IO consolidated `order.updated` events
- **Courier**: Kwik integration via backend webhooks

### Data Flow

1. **Order Created** → Patient creates order via chat
2. **Payment Captured** → Patient confirms and pays
3. **Mark Ready for Dispatch** → Pharmacist marks order as prepared
4. **Backend Auto-Books** → Backend evaluates gate (`paymentStatus: Paid` AND `isReadyForDispatch: true`) and creates Kwik job
5. **Kwik Updates** → Kwik sends webhooks → Backend emits `order.updated`
6. **Realtime Updates** → Frontend receives socket events, UI updates automatically
7. **Delivery** → Staff verifies OTP → Order marked DELIVERED

## Normalized Dispatch Statuses

| Status | Description | User Actions |
|--------|-------------|--------------|
| `BOOKED` | Dispatch created, awaiting pickup | Cancel Dispatch |
| `ASSIGNED` | Driver assigned, en route to pharmacy | Cancel Dispatch |
| `PICKED_UP` | Driver picked up from pharmacy | No actions |
| `IN_TRANSIT` | On way to delivery location | Confirm Delivery (OTP) |
| `DELIVERED` | Successfully delivered | — |
| `FAILED` | Delivery failed | Re-dispatch |
| `CANCELED` | Canceled before delivery | Re-dispatch |

## Key Endpoints

### Frontend API Calls
```typescript
// Get orders with unified pagination
GET /api/v1/orders?page=1&pageSize=10&status=BOOKED

// Get single order with full details
GET /api/v1/orders/{orderId}

// Mark order ready (triggers backend dispatch gate)
POST /orders/{orderId}/ready

// Verify delivery OTP
POST /dispatch/{dispatchId}/otp/verify { code: string }

// Cancel dispatch (pre-pickup only)
POST /orders/{orderId}/dispatch/cancel { reason?: string }
```

### Socket Events
- **Primary**: `order.updated` (consolidated)
- **Fallback**: `order:updated`, `dispatch:updated` (legacy support)

### Socket Rooms
- `order:{orderId}` - Join for individual order updates

## Failure Handling

### Common Scenarios

#### 1. Dispatch Creation Fails
**Symptoms**: "Mark Ready" button succeeds but no dispatch appears
- **Check**: Backend logs for `POST /orders/{id}/ready` response
- **Verify**: Payment status (`paymentStatus: Paid`)
- **Action**: Retry "Mark Ready" (idempotent)

#### 2. Missing Realtime Updates
**Symptoms**: UI doesn't reflect latest dispatch status
- **Check**: Socket connection status in browser console
- **Action**: Frontend falls back to polling every 60s if disconnected
- **Debug**: Verify socket room joined (`order:{orderId}`)

#### 3. OTP Verification Fails
**Symptoms**: OTP modal shows error
- **Check**: Backend logs for `POST /dispatch/{id}/otp/verify`
- **Common Causes**: Invalid code, dispatch already delivered, dispatch not in `IN_TRANSIT`
- **Action**: Verify dispatch status before retrying

#### 4. Kwik Webhook Failures
**Symptoms**: Status stuck at `BOOKED` or `ASSIGNED`
- **Check**: Backend webhook receiver logs
- **Action**: Backend has fallback poller; restart backend if needed
- **Manual**: Backend can manually update dispatch via admin tools

#### 5. Socket Disconnect
**Symptoms**: Real-time updates stop
- **Frontend**: Automatically polls every 60s until reconnected
- **Check**: Network tab for socket connection errors
- **Action**: Refresh page to reconnect

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `DISPATCH_CREATION_FAILED` | Failed to create Kwik job | Check backend/Kwik logs |
| `OTP_INVALID` | OTP code incorrect | Re-enter valid code |
| `DISPATCH_NOT_FOUND` | Dispatch ID not found | Check order state |
| `DISPATCH_ALREADY_DELIVERED` | Trying to verify already-delivered dispatch | UI bug - report |
| `PAYMENT_NOT_CAPTURED` | Trying to dispatch unpaid order | Verify payment status |
| `SOCKET_AUTH_FAILED` | Socket authentication error | Re-login |

## Observability

### Trace IDs
- `order.traceId` included in socket events and API responses
- Use for correlating logs across frontend → backend → Kwik

### Console Logs
- Frontend logs all socket events: `order.updated`, `dispatch:updated`
- Check browser console for:
  - `Order updated via socket: {payload}`
  - `Dispatch updated (fallback): {payload}`
  - Socket connection status messages

### Backend Logs
- Look for:
  - `DISPATCH_CREATED` → Kwik job creation
  - `WEBHOOK_RECEIVED` → Kwik status update
  - `DISPATCH_UPDATED` → Internal status change
  - `SOCKET_EMIT` → Event broadcast to frontend

## Testing Checklist

Before go-live, verify:
1. ✅ Order created via chat
2. ✅ Payment captured (mocked or real)
3. ✅ Mark Ready triggers dispatch (console shows `order.updated` with `dispatchStatus: BOOKED`)
4. ✅ Real-time status updates (`ASSIGNED` → `PICKED_UP` → `IN_TRANSIT`)
5. ✅ OTP verification works (`IN_TRANSIT` → `DELIVERED`)
6. ✅ Re-dispatch works (`FAILED` → `BOOKED`)
7. ✅ Cancel Dispatch works (`BOOKED` → `CANCELED` → Re-dispatch enabled)
8. ✅ Offline polling (disconnect network, wait 60s, verify refresh)

## Support Contacts

- **Backend Team**: @medsync-app-backend
- **Mobile Team**: @medsync-app
- **Pharmacy Web Team**: Implementation team

## Known Limitations

1. **Polling Fallback**: Only polls when socket disconnected; doesn't detect missed webhooks
2. **OTP Modal**: 6-digit numeric input only (no validation feedback before submit)
3. **Cancel Dispatch**: Only allowed for `BOOKED` or `ASSIGNED` statuses
4. **Re-dispatch**: Requires order to be `FAILED` or `CANCELED`

## Future Enhancements

- Add delivery ETA countdown
- Push notifications for order updates
- Batch actions (mark multiple orders ready)
- Export order/dispatch history
- Analytics dashboard for dispatch performance

