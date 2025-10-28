# MedSync Pharmacy Web App - API Endpoints & Data Requirements

## Overview
This document outlines all API endpoints and data requirements for the MedSync Pharmacy Web Application. The frontend expects specific response formats and data structures from the backend API.

## Base Configuration
- **Base URL**: `http://192.168.1.97:3000/api/v1`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **Request ID**: `X-Requested-With: XMLHttpRequest`

## Authentication Endpoints

### 1. User Login
- **Endpoint**: `POST /auth/login`
- **Purpose**: Authenticate pharmacy users
- **Request Data**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "role": "PHARMACIST" | "PHARMACY_OWNER",
        "pharmacyId": "string",
        "phone": "string",
        "createdAt": "string"
      },
      "tokens": {
        "accessToken": "string",
        "refreshToken": "string",
        "expiresIn": "string"
      }
    }
  }
  ```

### 2. User Registration (Pharmacy Owner)
- **Endpoint**: `POST /auth/register`
- **Purpose**: Register new pharmacy owners
- **Request Data**:
  ```json
  {
    "email": "string",
    "password": "string",
    "confirmPassword": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "PHARMACY_OWNER",
    "phone": "string",
    "pharmacyName": "string",
    "address": "string",
    "pharmacyEmail": "string",
    "licenseNumber": "string",
    "latitude": "number",
    "longitude": "number",
    "description": "string"
  }
  ```
- **Expected Response**: Same as login

### 3. Get Current User
- **Endpoint**: `GET /auth/me`
- **Purpose**: Get authenticated user information
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "role": "PHARMACIST" | "PHARMACY_OWNER",
        "pharmacyId": "string",
        "phone": "string",
        "createdAt": "string"
      }
    }
  }
  ```

### 4. Refresh Token
- **Endpoint**: `POST /auth/refresh`
- **Purpose**: Refresh expired access token
- **Request Data**:
  ```json
  {
    "refreshToken": "string"
  }
  ```

### 5. Logout
- **Endpoint**: `POST /auth/logout`
- **Purpose**: Logout user and invalidate tokens

## Pharmacy Management Endpoints

### 1. Get Pharmacy Profile
- **Endpoint**: `GET /pharmacy-management/my-pharmacy`
- **Purpose**: Get authenticated user's pharmacy information
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "pharmacy": {
        "id": "string",
        "name": "string",
        "licenseNumber": "string",
        "address": "string",
        "phone": "string",
        "email": "string",
        "latitude": "number",
        "longitude": "number",
        "description": "string",
        "isVerified": "boolean",
        "operatingHours": "object",
        "services": ["string"],
        "paymentMethods": ["string"],
        "createdAt": "string",
        "updatedAt": "string"
      }
    }
  }
  ```

### 2. Update Pharmacy Profile
- **Endpoint**: `PATCH /pharmacy-management/my-pharmacy`
- **Purpose**: Update pharmacy information

### 3. Get Pharmacy Locations/Branches
- **Endpoint**: `GET /pharmacy-management/pharmacies/{pharmacyId}/branches`
- **Purpose**: Get all pharmacy locations
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "branches": [
        {
          "id": "string",
          "name": "string",
          "address": "string",
          "latitude": "number",
          "longitude": "number",
          "pharmacyId": "string",
          "phone": "string",
          "isPrimaryLocation": "boolean",
          "createdAt": "string",
          "updatedAt": "string"
        }
      ]
    }
  }
  ```

### 4. Create Pharmacy Location
- **Endpoint**: `POST /pharmacy-management/pharmacies/{pharmacyId}/branches`
- **Purpose**: Add new pharmacy location

### 5. Update Pharmacy Location
- **Endpoint**: `PATCH /pharmacy-management/pharmacies/{pharmacyId}/branches/{locationId}`
- **Purpose**: Update pharmacy location

### 6. Delete Pharmacy Location
- **Endpoint**: `DELETE /pharmacy-management/pharmacies/{pharmacyId}/branches/{locationId}`
- **Purpose**: Delete pharmacy location

### 7. Get Pharmacy Staff
- **Endpoint**: `GET /pharmacy-management/pharmacies/{pharmacyId}/pharmacists`
- **Purpose**: Get all pharmacy staff members
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "pharmacists": [
        {
          "id": "string",
          "email": "string",
          "firstName": "string",
          "lastName": "string",
          "role": "PHARMACIST" | "PHARMACY_OWNER",
          "pharmacyId": "string",
          "createdAt": "string",
          "updatedAt": "string"
        }
      ]
    }
  }
  ```

### 8. Invite Staff Member
- **Endpoint**: `POST /pharmacy-management/pharmacies/{pharmacyId}/pharmacists`
- **Purpose**: Invite new staff member
- **Request Data**:
  ```json
  {
    "email": "string",
    "role": "string"
  }
  ```

### 9. Update Staff Role
- **Endpoint**: `PATCH /pharmacy-management/pharmacies/{pharmacyId}/pharmacists/{userId}`
- **Purpose**: Update staff member role

## Orders & Chat Endpoints

### 1. Get Orders/Chat Rooms
- **Endpoint**: `GET /chat-orders`
- **Purpose**: Get orders and chat rooms (dual-purpose endpoint)
- **Query Parameters**:
  - `status`: "PENDING" | "CONFIRMED" | "PREPARING" | "DISPENSED" | "DELIVERED" | "CANCELLED"
  - `dateFrom`: "string"
  - `dateTo`: "string"
  - `page`: "number"
  - `limit`: "number"
  - `search`: "string"
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "orders": [
        {
          "id": "string",
          "drugName": "string",
          "quantity": "number",
          "dosageSig": "string",
          "priceNgn": "number",
          "status": "string",
          "patient": {
            "id": "string",
            "name": "string",
            "phone": "string"
          },
          "createdAt": "string",
          "updatedAt": "string",
          "dispensedAt": "string",
          "deliveredAt": "string"
        }
      ],
      "rooms": [
        {
          "id": "string",
          "participants": [
            {
              "id": "string",
              "type": "patient" | "pharmacy"
            }
          ],
          "unreadCount": "number",
          "lastMessage": {
            "id": "string",
            "content": "string",
            "senderType": "patient" | "pharmacy",
            "createdAt": "string"
          },
          "createdAt": "string",
          "updatedAt": "string"
        }
      ],
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
  ```

### 2. Get Chat Room Messages
- **Endpoint**: `GET /chat-orders/{roomId}/messages`
- **Purpose**: Get messages for a specific chat room
- **Query Parameters**:
  - `page`: "number"
  - `limit`: "number"
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "messages": [
        {
          "id": "string",
          "roomId": "string",
          "senderId": "string",
          "senderType": "patient" | "pharmacy" | "system",
          "content": "string",
          "messageType": "TEXT" | "IMAGE" | "FILE",
          "createdAt": "string"
        }
      ],
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
  ```

### 3. Send Message
- **Endpoint**: `POST /chat-orders/{roomId}/messages`
- **Purpose**: Send message to chat room
- **Request Data**:
  ```json
  {
    "content": "string",
    "messageType": "TEXT" | "IMAGE" | "FILE"
  }
  ```

### 4. Update Order Status
- **Endpoint**: `PATCH /chat-orders/{orderId}/status`
- **Purpose**: Update order status
- **Request Data**:
  ```json
  {
    "status": "string",
    "notes": "string"
  }
  ```

### 5. Dispense Order
- **Endpoint**: `POST /chat-orders/{orderId}/dispense`
- **Purpose**: Mark order as dispensed
- **Request Data**:
  ```json
  {
    "notes": "string"
  }
  ```

## Dispatch & Delivery Endpoints

### 1. Book Delivery
- **Endpoint**: `POST /dispatch/book`
- **Purpose**: Book delivery for order
- **Request Data**:
  ```json
  {
    "orderId": "string",
    "pharmacyId": "string",
    "deliveryAddress": {
      "latitude": "number",
      "longitude": "number",
      "address": "string",
      "contactName": "string",
      "contactPhone": "string"
    },
    "vehicleType": "bike" | "van" | "auto",
    "specialInstructions": "string",
    "scheduledTime": "string"
  }
  ```

### 2. Get Delivery Quote
- **Endpoint**: `POST /dispatch/quote`
- **Purpose**: Get delivery quote
- **Request Data**:
  ```json
  {
    "pickupLocation": {
      "latitude": "number",
      "longitude": "number",
      "address": "string"
    },
    "deliveryLocation": {
      "latitude": "number",
      "longitude": "number",
      "address": "string"
    },
    "vehicleType": "bike" | "van" | "auto",
    "packageWeight": "number",
    "packageValue": "number"
  }
  ```

### 3. Get Dispatch Requests
- **Endpoint**: `GET /dispatch/requests`
- **Purpose**: Get dispatch requests
- **Query Parameters**:
  - `status`: "REQUESTED" | "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "FAILED"
  - `urgency`: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  - `dateFrom`: "string"
  - `dateTo`: "string"
  - `page`: "number"
  - `limit`: "number"

### 4. Get Delivery History
- **Endpoint**: `GET /dispatch/history`
- **Purpose**: Get delivery history
- **Query Parameters**: Same as dispatch requests

### 5. Update Dispatch Status
- **Endpoint**: `PATCH /dispatch/requests/{requestId}/status`
- **Purpose**: Update dispatch status
- **Request Data**:
  ```json
  {
    "status": "string",
    "notes": "string"
  }
  ```

### 6. Track Delivery
- **Endpoint**: `GET /dispatch/{dispatchId}`
- **Purpose**: Track delivery status

## Public Endpoints

### 1. Get Public Pharmacies
- **Endpoint**: `GET /pharmacies`
- **Purpose**: Get list of pharmacies (public)
- **Query Parameters**:
  - `limit`: "number"
  - `offset`: "number"
  - `search`: "string"

### 2. Get Specific Pharmacy
- **Endpoint**: `GET /pharmacies/{id}`
- **Purpose**: Get specific pharmacy details (public)

## Socket.IO Events

### Real-time Updates
- **Connection**: WebSocket connection with JWT token
- **Events**:
  - `notification`: Real-time notifications
  - `emergency_alert`: Emergency alerts
  - `order_update`: Order status updates
  - `chat_message`: New chat messages
  - `dispatch_update`: Delivery status updates

## Error Response Format

All endpoints should return errors in this format:
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "any"
  },
  "timestamp": "string",
  "correlationId": "string"
}
```

## Success Response Format

All successful responses should follow this format:
```json
{
  "success": true,
  "data": "any",
  "message": "string",
  "timestamp": "string",
  "correlationId": "string"
}
```

## Frontend Requirements Summary

### Critical Endpoints Needed:
1. ✅ `GET /auth/me` - Must return user with `firstName`, `lastName`, `pharmacyId`
2. ✅ `GET /pharmacy-management/my-pharmacy` - Must return pharmacy profile
3. ✅ `GET /chat-orders` - Must return both orders and chat rooms
4. ✅ `GET /pharmacy-management/pharmacies/{id}/pharmacists` - Must return staff list
5. ✅ `GET /pharmacy-management/pharmacies/{id}/branches` - Must return locations
6. ✅ `POST /auth/register` - Must handle pharmacy registration with coordinates
7. ✅ `POST /dispatch/book` - Must handle delivery booking
8. ✅ `GET /dispatch/requests` - Must return dispatch requests
9. ✅ `GET /dispatch/history` - Must return delivery history

### Data Structure Requirements:
- All responses must include `success` field
- User object must have `firstName`, `lastName`, `pharmacyId` fields
- Pharmacy object must have `id`, `name`, `address`, `licenseNumber` fields
- Orders must have `patient.id`, `drugName`, `status` fields
- Chat rooms must have `participants`, `unreadCount`, `lastMessage` fields
- Locations must have `isPrimaryLocation` field (not `isPrimary`)

### Authentication Requirements:
- All protected endpoints require Bearer token in Authorization header
- Token refresh mechanism must work with `/auth/refresh` endpoint
- Role-based access control for `PHARMACY_OWNER` and `PHARMACIST` roles

This document provides the complete interface requirements for the backend team to implement the necessary endpoints and data structures for the MedSync Pharmacy Web Application.
