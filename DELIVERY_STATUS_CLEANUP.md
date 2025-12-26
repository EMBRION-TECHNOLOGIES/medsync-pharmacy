# Pharmacy Web App - Delivery Status Cleanup

## Current State Analysis

### 1. ChatWindow.tsx - Order Status Bubbles

**What IS:**
- All order status bubbles show a simple "View Full Details →" link
- Link navigates to `/orders/${orderData.orderId}` for ALL statuses
- No differentiation between regular statuses and delivery statuses
- Not styled as buttons, just text links

**Statuses Handled:**
- `pending` - ⏳ Awaiting Patient Confirmation
- `confirmed` - ✅ Confirmed — Pharmacy Preparing
- `preparing` - 📦 Preparing Medication
- `prepared` - ✨ Prepared — Ready on Counter
- `out_for_delivery` - 🚚 Courier Booked — On the Way
- `dispensed` - 💊 Dispensed — Courier Has It
- `delivered` - 🎉 Delivered Successfully

### 2. OrderDetailPage (`/orders/[orderId]/page.tsx`)

**What IS:**
- Shows basic dispatch info in a card (if dispatch exists)
- Shows OTP modal button for `IN_TRANSIT` dispatch status
- Does NOT show:
  - Live delivery tracking with driver info, ETA for `OUT_FOR_DELIVERY`/`DISPENSED` orders
  - OTP confirmation UI for `DELIVERED` orders (only shows modal for `IN_TRANSIT`)
  - Real-time delivery status updates

**Current Dispatch Card:**
- Shows provider, tracking number, tracking URL, ETA
- No driver information
- No live status updates
- No ETA countdown

## What SHOULD Be

### 1. ChatWindow.tsx - Order Status Bubbles

**Delivery Status Bubbles (`OUT_FOR_DELIVERY`, `DISPENSED`, `DELIVERED`):**
- Should be styled as clickable buttons (not just links)
- Should navigate to order details page (same URL)
- Should have visual indication that they're interactive (hover effects, button styling)
- Should show "📍 Tap to track →" or similar hint text

**Regular Status Bubbles:**
- Keep as-is (links to order details)

### 2. OrderDetailPage - Delivery Tracking

**For `OUT_FOR_DELIVERY` and `DISPENSED` orders:**
- Show live delivery tracking card with:
  - Driver name and phone
  - Vehicle type and number
  - Current status (BOOKED, ASSIGNED, PICKED_UP, IN_TRANSIT)
  - ETA countdown
  - Real-time status updates (poll every 30 seconds)
  - "View Live Tracking" button (if tracking URL available)

**For `DELIVERED` orders:**
- Show OTP confirmation UI (if not already confirmed)
- Allow pharmacy to verify delivery with OTP
- Show delivery confirmation message after verification

**Implementation Details:**
- Use `useTrackDelivery(dispatchId)` hook to poll for updates
- Use `DispatchCard` component or create new `DeliveryTrackingCard`
- Show driver info from `dispatch.driver` object
- Show ETA from `dispatch.estimatedArrival`
- Show OTP from `dispatch.otp` for DELIVERED orders

## Status Flow Summary

| Order Status | Dispatch Status | What Should Show |
|-------------|----------------|------------------|
| `PENDING` | — | Order details, confirm button |
| `CONFIRMED` | — | Order details, timeline |
| `PREPARING` | — | Order details, timeline |
| `PREPARED` | — | Order details, cost breakdown |
| `DISPENSED` | `BOOKED` | **Delivery tracking card** with driver info, ETA |
| `DISPENSED` | `ASSIGNED` | **Delivery tracking card** with driver info, ETA |
| `DISPENSED` | `PICKED_UP` | **Delivery tracking card** with driver info, ETA |
| `OUT_FOR_DELIVERY` | `IN_TRANSIT` | **Delivery tracking card** with driver info, ETA |
| `DELIVERED` | `DELIVERED` | **OTP confirmation UI** (if not verified) |

## Files to Update

1. `components/chat/ChatWindow.tsx` - Make delivery bubbles clickable buttons
2. `app/(protected)/orders/[orderId]/page.tsx` - Add delivery tracking card and OTP UI
3. `components/dispatch/DispatchCard.tsx` - Enhance to show driver info (or create new component)
4. `components/orders/OrderTimeline.tsx` - Ensure all delivery statuses are shown



