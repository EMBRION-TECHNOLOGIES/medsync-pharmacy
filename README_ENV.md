# Pharmacy App Environment Configuration

## Quick Start

### Development (Next.js Dev Server)

```bash
# Use local backend (http://192.168.1.98:3000)
npm run dev:local

# Use Railway backend (https://medsync-api-v1.up.railway.app)
npm run dev:railway

# Use .env.local file (default)
npm run dev
```

### Production Builds

```bash
# Build with local backend
npm run build:local

# Build with Railway backend (recommended for production)
npm run build:railway

# Build using .env.local file
npm run build
```

---

## Configuration Methods

### Method 1: npm Scripts (Recommended - Easy Switching)

```bash
# Development
npm run dev:local    # Local backend
npm run dev:railway  # Railway backend

# Production builds
npm run build:local    # Local backend
npm run build:railway  # Railway backend
```

### Method 2: Environment Variables (Manual)

```bash
# Local backend
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.98:3000/api/v1 \
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.98:3000 \
npm run dev

# Railway backend
NEXT_PUBLIC_API_BASE_URL=https://medsync-api-v1.up.railway.app/api/v1 \
NEXT_PUBLIC_SOCKET_URL=https://medsync-api-v1.up.railway.app \
npm run dev
```

### Method 3: .env.local File (Persistent)

Edit `.env.local`:

```env
# For local backend
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.98:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.98:3000

# OR for Railway backend
# NEXT_PUBLIC_API_BASE_URL=https://medsync-api-v1.up.railway.app/api/v1
# NEXT_PUBLIC_SOCKET_URL=https://medsync-api-v1.up.railway.app
```

Then just run:
```bash
npm run dev
```

---

## Environment Variables

| Variable | Description | Local Example | Railway Example |
|----------|-------------|---------------|-----------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://192.168.1.98:3000/api/v1` | `https://medsync-api-v1.up.railway.app/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | `http://192.168.1.98:3000` | `https://medsync-api-v1.up.railway.app` |
| `NEXT_PUBLIC_SOCKET_NAMESPACE` | Socket namespace | `/patient-pharmacy` | `/patient-pharmacy` |

**Note:** In Next.js, variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## How It Works

1. **Priority 1**: Environment variables in command (npm scripts)
2. **Priority 2**: `.env.local` file (if exists)
3. **Priority 3**: `.env` file (if exists)
4. **Fallback**: Hardcoded defaults in code

---

## File Locations

- **`.env.local`** - Local development config (git-ignored)
- **`env.example`** - Example template (committed to git)
- **`lib/api.ts`** - API client (reads `NEXT_PUBLIC_API_BASE_URL`)
- **`lib/socketService.ts`** - Socket client (reads `NEXT_PUBLIC_SOCKET_URL`)

---

## Custom Local IP

If your local IP is different, update the scripts in `package.json`:

```json
"dev:local": "NEXT_PUBLIC_API_BASE_URL=http://YOUR_IP:3000/api/v1 ..."
```

Or set it in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.100:3000
```

---

## Summary

| Command | Backend | Use Case |
|---------|---------|----------|
| `npm run dev:local` | Local | Active development |
| `npm run dev:railway` | Railway | Test against production API |
| `npm run build:railway` | Railway | Production build (recommended) |


