import { z } from 'zod';

// API Response wrapper schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.string().optional(),
  correlationId: z.string().optional(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string(),
  correlationId: z.string().optional(),
});

export type ApiResponse<T = unknown> = z.infer<typeof apiResponseSchema> & { data: T };
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'PHARMACIST', 'PHARMACY_OWNER']).default('PATIENT'),
});

export const pharmacyRegistrationSchema = z.object({
  // User registration fields
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password confirmation is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['PHARMACIST', 'PHARMACY_OWNER']),
  
  // Pharmacy registration fields
  pharmacyName: z.string().min(1, 'Pharmacy name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone number is required'),
  pharmacyEmail: z.string().email('Invalid pharmacy email'),
  licenseNumber: z.string().min(1, 'License number is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  longitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  description: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.string().optional(),
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['PATIENT', 'DOCTOR', 'PHARMACIST', 'PHARMACY_OWNER', 'ADMIN', 'STAFF']),
  pharmacyId: z.string().optional(),
  phone: z.string().optional(),
  createdAt: z.string(),
  verificationStatus: verificationStatusSchema.optional(),
  verificationNotes: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PharmacyRegistrationInput = z.infer<typeof pharmacyRegistrationSchema>;
export type Tokens = z.infer<typeof tokensSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

// Order schemas - Updated to match API
export const orderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'DISPENSED', 'DELIVERED', 'CANCELLED']);

export const orderItemSchema = z.object({
  id: z.string(),
  drugName: z.string(),
  quantity: z.number(),
  dosageSig: z.string(),
  priceNgn: z.number(),
});

export const orderSchema = z.object({
  id: z.string(),
  drugName: z.string(),
  quantity: z.number(),
  dosageSig: z.string(),
  priceNgn: z.number(),
  status: orderStatusSchema,
  patient: z.object({
    id: z.string(),
    phone: z.string(),
  }),
  pharmacy: z.object({
    id: z.string(),
    name: z.string(),
  }),
  chatRoom: z.object({
    id: z.string(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dispensedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Chat schemas - Updated to match API
export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  senderType: z.enum(['patient', 'pharmacy', 'system']),
  content: z.string(),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
  createdAt: z.string(),
});

export const chatRoomSchema = z.object({
  id: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    type: z.enum(['patient', 'pharmacy', 'PATIENT', 'PHARMACY']),
    name: z.string().optional(),
  })),
  lastMessage: chatMessageSchema.optional(),
  unreadCount: z.number().optional(),
  status: z.enum(['ACTIVE', 'CLOSED']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRoom = z.infer<typeof chatRoomSchema>;

// Dispatch schemas - Updated to match API
export const dispatchProviderSchema = z.enum(['kwik', 'gokada', 'auto']);

export const dispatchStatusSchema = z.enum([
  'BOOKED',
  'ASSIGNED', 
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'CANCELED',
]);

export const dispatchSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  pharmacyId: z.string(),
  provider: dispatchProviderSchema,
  status: dispatchStatusSchema,
  pickupLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  deliveryLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    contactName: z.string(),
    contactPhone: z.string(),
  }),
  vehicleType: z.enum(['bike', 'van', 'auto']).optional(),
  driver: z.object({
    name: z.string(),
    phone: z.string(),
    vehicleType: z.string(),
    vehicleNumber: z.string().optional(),
  }).optional(),
  estimatedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  trackingUrl: z.string().optional(),
  otp: z.string().optional(),
  updates: z.array(z.object({
    status: dispatchStatusSchema,
    timestamp: z.string(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    message: z.string().optional(),
  })).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Dispatch = z.infer<typeof dispatchSchema>;
export type DispatchProvider = z.infer<typeof dispatchProviderSchema>;
export type DispatchStatus = z.infer<typeof dispatchStatusSchema>;

// Pharmacy schemas - Updated to match API
export const userRoleSchema = z.enum(['PHARMACIST', 'PHARMACY_OWNER']);

export const pharmacySchema = z.object({
  id: z.string(),
  name: z.string(),
  licenseNumber: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional(),
  isVerified: z.boolean().optional(),
  operatingHours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  })).optional(),
  services: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pharmacyUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  pharmacyId: z.string(),
  createdAt: z.string(),
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  pharmacyId: z.string(),
  isPrimary: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Pharmacy = z.infer<typeof pharmacySchema>;
export type PharmacyUser = z.infer<typeof pharmacyUserSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Location = z.infer<typeof locationSchema>;

// Notification schemas
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  isRead: z.boolean(),
  data: z.any().optional(),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

