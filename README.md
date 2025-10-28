# MedSync Pharmacy Portal

A production-ready pharmacy management web application built with Next.js 14, TypeScript, and modern web technologies. This portal connects to the MedSync backend API to provide comprehensive pharmacy operations management.

## Features

- **Order Management**: View, confirm, dispense, and track pharmacy orders
- **Real-time Chat**: Communicate with patients in real-time
- **Dispatch Integration**: Manage deliveries with Kwik and Gokada providers
- **Multi-location Support**: Handle operations across multiple pharmacy locations
- **Staff Management**: Invite team members and manage roles (Admin, Pharmacist, Dispatch, Viewer)
- **Real-time Updates**: WebSocket integration for live order and dispatch updates
- **Role-Based Access Control**: Different permission levels for different staff roles

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: 
  - React Query (TanStack Query) for server state
  - Zustand for client/UI state
- **Forms**: React Hook Form + Zod validation
- **API Client**: Axios with JWT authentication
- **Real-time**: Socket.io-client
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Access to MedSync backend API
- Backend API URL and Socket URL

### Installation

1. Clone the repository or navigate to the project directory:

```bash
cd medsync-pharmacy
```

2. Install dependencies:

```bash
npm install
```

3. Create environment variables file:

```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your backend URLs:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.com
NODE_ENV=development
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
medsync-pharmacy/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/             # Login page
│   └── (protected)/           # Protected routes
│       ├── dashboard/         # Main dashboard
│       ├── orders/            # Order management
│       ├── chat/              # Patient communication
│       ├── dispatch/          # Delivery management
│       ├── staff/             # Team management
│       ├── locations/         # Location management
│       └── settings/          # Settings
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/                # Layout components (Sidebar, Topbar)
│   ├── orders/                # Order-related components
│   ├── chat/                  # Chat components
│   ├── dispatch/              # Dispatch components
│   ├── staff/                 # Staff management components
│   └── common/                # Shared components
├── features/                  # Business logic by domain
│   ├── auth/                  # Authentication
│   ├── orders/                # Orders service & hooks
│   ├── chat/                  # Chat service & hooks
│   ├── dispatch/              # Dispatch service & hooks
│   └── pharmacy/              # Pharmacy service & hooks
├── lib/                       # Utilities & configuration
│   ├── api.ts                 # Axios instance
│   ├── socket.ts              # Socket.io client
│   ├── queryClient.ts         # React Query config
│   └── zod-schemas.ts         # Type schemas
└── store/                     # Zustand stores
    └── useOrg.ts              # Organization state
```

## Key API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Orders
- `GET /orders` - List orders with filters
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id/status` - Update order status
- `PATCH /orders/:id/dispense` - Dispense order

### Chat
- `GET /chat/threads` - List conversation threads
- `GET /chat/messages` - Get messages for a thread
- `POST /chat/messages` - Send a message

### Dispatch
- `POST /dispatch/request` - Request delivery
- `GET /dispatch/track/:id` - Track delivery
- `POST /dispatch/:id/cancel` - Cancel delivery

### Pharmacy
- `GET /pharmacy/:id` - Get pharmacy details
- `GET /pharmacy/:id/locations` - List locations
- `GET /pharmacy/:id/users` - List staff
- `POST /pharmacy/:id/invitations` - Invite staff member

## User Roles

### Admin
- **Full system access** including staff management, settings, and all operations
- Can manage staff members (invite, remove, change roles)
- Can manage pharmacy settings and configurations
- Can access all operational features (orders, chat, dispatch, reports)
- Can manage locations and API integrations

### Pharmacist
- **All operational features** including orders, chat, dispatch monitoring, and reports
- Can manage orders (confirm, decline, dispense)
- Can chat with patients and provide support
- Can monitor dispatch operations (not booking - backend handles that)
- Can view reports and analytics
- **Cannot** manage staff or system settings

## Real-time Features

The application uses WebSocket connections for real-time updates:

- **Order Updates**: Live notifications when orders are created or updated
- **Chat Messages**: Instant message delivery and receipt
- **Dispatch Status**: Real-time delivery tracking updates

WebSocket rooms are organized by pharmacy and location:
- `pharmacy:{id}:location:{id}` - Location-specific updates
- `pharmacy:{id}` - Pharmacy-wide updates
- `chat:{threadId}` - Chat thread updates

## Security

- JWT authentication stored in HttpOnly cookies
- All API requests scoped to authenticated user's pharmacy
- Role-based access control enforced on both frontend and backend
- Patient PII hidden, using MedSync ID aliases
- Socket rooms validated server-side before joining

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_SOCKET_URL`
4. Deploy

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `https://api.medsync.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | `https://api.medsync.com` |
| `NODE_ENV` | Environment | `development` or `production` |

## Troubleshooting

### Build Errors

If you encounter build errors, try:

```bash
rm -rf .next node_modules
npm install
npm run build
```

### Socket Connection Issues

Ensure:
- `NEXT_PUBLIC_SOCKET_URL` is correctly set
- Backend WebSocket server is running
- CORS is properly configured on the backend

### Authentication Issues

- Check that cookies are enabled in your browser
- Verify `withCredentials: true` is set in API client
- Ensure backend sets HttpOnly cookies correctly

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - MedSync Technologies

## Support

For support, contact the MedSync development team or consult the backend API documentation.
