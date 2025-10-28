# Dispatch & Order History - Sandbox Notes

## Current Backend API Status

### Unified Endpoints (Not Yet Implemented)
- ❌ `GET /api/v1/orders` - 404 in sandbox
- ❌ `GET /api/v1/orders/{id}` - 404 in sandbox
- ❌ `POST /orders/{id}/ready` - 404 in sandbox

### Working Endpoints (Fallback)
- ✅ `GET /chat-orders` - Returns orders with chat metadata
- ✅ `GET /chat-orders/{id}` - Returns single order
- ✅ `POST /chat-orders/{id}/dispense` - Marks order as dispensed

### Frontend Solution

The frontend now **automatically falls back** to `/chat-orders` when `/api/v1/orders` returns 404.

This means:
1. ✅ Page loads successfully
2. ✅ Orders list displays
3. ✅ Order detail page works
4. ✅ Mark Ready action works (uses `/chat-orders/{id}/dispense`)

### What to Expect

**Orders List (`/orders`):**
- Uses `/chat-orders` endpoint
- Shows all orders from chat
- Status badges reflect current order state
- Search and filter work

**Order Detail (`/orders/[orderId]`):**
- Uses `/chat-orders/{id}` endpoint
- Shows order information
- "Mark Ready for Dispatch" button works (calls `/chat-orders/{id}/dispense`)
- Timeline shows basic events
- Socket updates still work (if backend emits `order.updated` events)

**Limitations (Until Unified API Ready):**
- Dispatch-specific statuses may not be available (rely on order status)
- OTP verification may not work until backend implements endpoint
- Cancel dispatch may not work until backend implements endpoint

---

## Creating Test Orders

### How Orders Are Actually Created

**Pharmacists DON'T create orders** - patients create them via chat.

#### Workflow:
1. **Patient** opens mobile app
2. **Patient** starts chat with pharmacy
3. **Patient** sends prescription image or text
4. **Pharmacist** responds with quote in chat
5. **Patient** confirms quote → **Order Created**
6. **Patient** pays → **Payment Captured**
7. **Pharmacist** marks order as prepared → **Order Ready for Dispatch**
8. **Backend** auto-creates Kwik dispatch → **Dispatch Booked**
9. **Kwik** updates status → **Dispatch Status Updates**
10. **Pharmacist** verifies OTP → **Delivered**

### Creating a Test Order for Development

#### Option 1: Use the Chat Feature
1. Open `/chat` in pharmacy web
2. Patient starts conversation (via mobile app or test user)
3. Patient sends quote request
4. Pharmacist creates quote
5. Order appears in `/orders`

#### Option 2: Backend Seed Script
If backend has seed scripts:
```bash
cd backend
npm run seed:test-orders
```

#### Option 3: Direct Backend API Call
Create a test order via cURL or Postman:
```bash
POST https://your-backend.com/api/test/orders
{
  "patientId": "patient_123",
  "pharmacyId": "your_pharmacy_id",
  "items": [
    { "drugId": "drug_123", "quantity": 1 }
  ]
}
```

---

## Testing Flow (Sandbox)

### Prerequisites
1. ✅ Backend running in sandbox
2. ✅ Socket server connected
3. ✅ Pharmacy user logged in

### Test Steps

1. **Create Order via Chat**
   - Use mobile app or test patient account
   - Send prescription to pharmacy
   - Pharmacist creates quote
   - Patient confirms

2. **View Orders**
   - Go to `/orders`
   - Verify order appears in list
   - Click to open detail page

3. **Mark Ready**
   - Click "Mark Ready for Dispatch"
   - Verify status changes
   - Check for `order.updated` socket event in console

4. **Monitor Dispatch** (if implemented)
   - Watch for dispatch status updates
   - Verify timeline updates
   - Check for delivery status

---

## Kwik Webhook Status

### Sandbox
- ❌ Webhooks NOT available
- ✅ Use polling every 2 minutes
- ✅ Backend must implement `/api/track/{jobId}` polling

### Production
- ✅ Webhooks available (after backend registers with Kwik)
- ✅ Backend receives `POST /api/v1/dispatch/kwik/webhook`
- ✅ Fallback poller still runs for reliability

---

## Quick Fix Summary

✅ **Fixed**: Frontend now uses `/chat-orders` fallback when unified API returns 404  
✅ **Fixed**: `markOrderReady` now uses `/chat-orders/{id}/dispense`  
✅ **Working**: Orders list, order detail, mark ready, socket updates  
⏳ **Pending**: Unified API endpoints need to be implemented by backend  
⏳ **Pending**: OTP verification needs backend implementation  
⏳ **Pending**: Cancel dispatch needs backend implementation  

---

## Next Steps for Backend Team

1. Implement unified `/api/v1/orders` endpoints
2. Implement `POST /orders/{id}/ready` endpoint
3. Implement `POST /dispatch/{id}/otp/verify` endpoint
4. Implement `POST /orders/{id}/dispatch/cancel` endpoint
5. Set up Kwik polling for sandbox environment
6. Contact Kwik for webhook registration for production

---

## Frontend Status: ✅ READY

The frontend is fully prepared for the unified API. Once the backend implements the new endpoints, everything will work seamlessly. In the meantime, the fallback ensures all core features work.

