# Dispatch & Order History Staging Test Plan

## Environment Setup

### Prerequisites
- Backend running on staging with Kwik sandbox credentials
- Frontend deployed to staging URL
- Valid test pharmacy account
- Test patient account (mobile app)
- Socket server connected

### Test Accounts
- **Pharmacy**: Username/password in 1Password
- **Patient**: Username/password in 1Password

## Test Scenarios

### 1. Happy Path: Complete Order Flow

**Steps:**
1. Open pharmacy web at `/orders`
2. Create order via chat (simulate patient or use mobile app)
3. Patient confirms order and makes payment (mocked or real)
4. Navigate to `/orders` - verify order appears with status `CONFIRMED`
5. Click order to open detail page
6. Click "Mark Ready for Dispatch"
7. Verify toast notification "Order marked ready for dispatch"
8. Verify `dispatchStatus` changes to `BOOKED` (check console for `order.updated` event)
9. Wait for Kwik to assign driver → verify `dispatchStatus` becomes `ASSIGNED`
10. Wait for pickup → verify `dispatchStatus` becomes `PICKED_UP`
11. Wait for transit → verify `dispatchStatus` becomes `IN_TRANSIT`
12. Click "Confirm Delivery (OTP)" button
13. Enter valid 6-digit OTP code
14. Verify toast "Delivery confirmed"
15. Verify `dispatchStatus` becomes `DELIVERED`
16. Verify timeline shows all events chronologically

**Expected Results:**
- ✅ All status transitions work smoothly
- ✅ Socket events received in real-time
- ✅ Timeline displays all events with correct timestamps
- ✅ OTP verification succeeds
- ✅ Final status is `DELIVERED`

---

### 2. Re-dispatch Flow (FAILED)

**Steps:**
1. Navigate to an order with `FAILED` dispatch status
2. Verify "Re-dispatch" button is visible
3. Click "Re-dispatch"
4. Verify order is marked ready again
5. Verify dispatch is re-booked (`dispatchStatus: BOOKED`)

**Expected Results:**
- ✅ Re-dispatch button appears for FAILED status
- ✅ Clicking re-dispatch marks order ready
- ✅ New dispatch created successfully
- ✅ Can complete full flow again

---

### 3. Re-dispatch Flow (CANCELED)

**Steps:**
1. Find or create order with `CANCELED` dispatch status
2. Verify "Re-dispatch" button is visible
3. Click "Re-dispatch"
4. Verify order is marked ready again
5. Verify dispatch is re-booked

**Expected Results:**
- ✅ Same as FAILED scenario above

---

### 4. Cancel Dispatch Flow

**Steps:**
1. Mark order ready for dispatch
2. Wait for dispatch to be `BOOKED` or `ASSIGNED`
3. Click "Cancel Dispatch" button
4. Confirm cancellation in dialog
5. Verify toast "Dispatch cancelled"
6. Verify `dispatchStatus` becomes `CANCELED` or removed
7. Verify "Re-dispatch" button appears

**Expected Results:**
- ✅ Cancel button appears for BOOKED/ASSIGNED
- ✅ Confirmation dialog works
- ✅ Dispatch cancelled successfully
- ✅ Re-dispatch option available
- ✅ No error in console

---

### 5. Offline Polling Fallback

**Steps:**
1. Open order detail page for active dispatch (`IN_TRANSIT`)
2. Open browser DevTools → Network tab
3. Toggle "Offline" mode in DevTools
4. Verify socket shows disconnect status in console
5. Wait 60+ seconds
6. Check for polling attempts in Network tab (`GET /api/v1/orders/{id}`)
7. Toggle "Online" mode
8. Verify UI updates within 60s

**Expected Results:**
- ✅ Socket disconnect detected
- ✅ Polling occurs every 60s when offline
- ✅ UI updates when connection restored
- ✅ No infinite loading states

---

### 6. Real-time Updates (Socket)

**Steps:**
1. Open order detail page
2. In another tab/window: simulate backend dispatch update (or use mobile app to trigger update)
3. Watch console for: `Order updated via socket: {payload}`
4. Verify UI updates automatically without refresh
5. Verify timeline updates
6. Verify status badges update

**Expected Results:**
- ✅ Socket event received
- ✅ UI updates without page refresh
- ✅ Timeline adds new events
- ✅ Badges reflect new status

---

### 7. Search & Filter (Orders List)

**Steps:**
1. Navigate to `/orders`
2. Use search box - enter part of order ID
3. Verify results filter correctly
4. Select status filter dropdown - choose "DELIVERED"
5. Verify only delivered orders show
6. Clear filters
7. Verify all orders show again

**Expected Results:**
- ✅ Search works across order IDs
- ✅ Status filter works for all statuses
- ✅ Filters can be cleared
- ✅ No crashes on empty results

---

### 8. Timeline Events

**Steps:**
1. Open order with various events
2. Verify timeline shows:
   - `OrderCreated` with timestamp
   - `PaymentCaptured` with timestamp
   - `OrderPrepared` with timestamp
   - `DispatchBooked` with timestamp (if dispatched)
   - `Delivered` with timestamp (if delivered)
3. Verify icons match event types
4. Verify chronological order (newest last or first, depending on design)

**Expected Results:**
- ✅ All events visible
- ✅ Icons appropriate for each event
- ✅ Timestamps formatted correctly
- ✅ Order is chronological
- ✅ Empty state works ("No events yet")

---

### 9. OTP Modal

**Steps:**
1. Open order with `IN_TRANSIT` status
2. Click "Confirm Delivery (OTP)"
3. Verify modal opens
4. Enter invalid OTP (wrong 6 digits)
5. Submit
6. Verify error toast
7. Enter correct OTP
8. Submit
9. Verify success toast
10. Verify modal closes
11. Verify order refreshed with DELIVERED status

**Expected Results:**
- ✅ Modal opens/closes correctly
- ✅ 6-digit numeric input only
- ✅ Invalid OTP shows error
- ✅ Valid OTP succeeds
- ✅ Order updates to DELIVERED

---

### 10. Permission & Action Gates

**Steps:**
1. For order with `paymentStatus: Pending`:
   - Verify "Mark Ready" button is disabled
2. For order with `dispatchStatus: BOOKED`:
   - Verify "Mark Ready" button is not visible
   - Verify "Cancel Dispatch" button is visible
3. For order with `dispatchStatus: DELIVERED`:
   - Verify no action buttons visible
4. For order with `dispatchStatus: IN_TRANSIT`:
   - Verify "Confirm Delivery (OTP)" button is visible

**Expected Results:**
- ✅ Buttons respect business logic gates
- ✅ No undefined behavior
- ✅ Clear visual feedback (disabled states)

---

## Regression Tests

### API Endpoints
- ✅ `GET /api/v1/orders` returns unified pagination shape
- ✅ `GET /api/v1/orders/{id}` returns `OrderDTO` with all fields
- ✅ `POST /orders/{id}/ready` marks ready and creates dispatch
- ✅ `POST /dispatch/{id}/otp/verify` verifies and updates to DELIVERED
- ✅ `POST /orders/{id}/dispatch/cancel` cancels dispatch

### Socket Events
- ✅ `order.updated` event received
- ✅ `order:updated` fallback works
- ✅ `dispatch:updated` fallback works
- ✅ Socket room `order:{orderId}` join/leave works

### Type Safety
- ✅ No TypeScript errors in console
- ✅ All imports resolve correctly
- ✅ Status types match backend enum

---

## Edge Cases

1. **Rapid status changes**: Open order detail, then rapidly trigger multiple status updates via backend
2. **Socket reconnect**: Disconnect and reconnect rapidly
3. **Invalid order ID**: Navigate to `/orders/invalid-id`
4. **Missing fields**: Order without dispatch object
5. **Empty events array**: Order with no timeline events

---

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Performance

- Verify: Initial page load < 2s
- Verify: Socket connection < 1s
- Verify: Search/filter responsive < 500ms
- Verify: No memory leaks on long sessions

---

## Sign-off

**Tested by**: _________________
**Date**: _________________
**Environment**: Staging
**Backend version**: _________________
**Frontend version**: _________________

### Notes
- Any issues found:
  - 
  - 
  - 

---

## Next Steps

After successful staging tests:
1. Deploy to production
2. Monitor error rates for first 24 hours
3. Gather user feedback
4. Update ops guide based on findings

