# Quick Start Guide - MedSync Pharmacy Portal

Get up and running with the MedSync Pharmacy Portal in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- MedSync backend API running

## Step 1: Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Edit `.env.local` with your backend URLs:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NODE_ENV=development
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Run Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Step 4: Login

Navigate to [http://localhost:3000/login](http://localhost:3000/login) and use your pharmacy credentials.

## Default Routes

Once logged in, you'll have access to:

- **Dashboard** - `/dashboard` - Overview of operations
- **Orders** - `/orders` - Manage pharmacy orders
- **Chat** - `/chat` - Communicate with patients
- **Dispatch** - `/dispatch` - Manage deliveries
- **Staff** - `/staff` - Team management
- **Locations** - `/locations` - Location management
- **Settings** - `/settings` - Configuration

## Production Build

To create a production build:

```bash
npm run build
npm start
```

## Troubleshooting

### Can't connect to backend?
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
- Ensure backend server is running
- Check CORS settings on backend

### Socket connection fails?
- Verify `NEXT_PUBLIC_SOCKET_URL` in `.env.local`
- Ensure WebSocket server is accessible
- Check browser console for errors

### Authentication issues?
- Clear browser cookies
- Check HttpOnly cookie settings on backend
- Verify JWT token is being set correctly

## Next Steps

1. Configure your pharmacy profile in Settings
2. Invite team members in Staff management
3. Add your pharmacy locations
4. Start managing orders!

## Support

For issues or questions, refer to the main [README.md](README.md) or contact the development team.

