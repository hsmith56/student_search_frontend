# Student Search Frontend

Next.js frontend for:
- student search and filtering
- student profile dialog/details
- dashboard analytics mockup
- news feed events
- auth/login/register and favorites

## Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts

## Main Routes
- `/` - Student Search
- `/dashboard` - Dashboard view
- `/newsFeed` - News Feed
- `/feedback` - Feedback board
- `/StudentProfile` - Full student profile page
- `/login` - Login/Register

## Prerequisites (New Machine)
1. Install Node.js 20+ (Node 22 LTS recommended).
2. Install npm (comes with Node).
3. Have backend services running and reachable from the frontend under:
   - `/api/*`
   - `/notifications/ws/placements` (WebSocket)
4. If backend is not same-origin, set up a reverse proxy (recommended) so frontend can still call `/api` and `/notifications/ws/placements`.

Important: this frontend currently calls API as `/api` (relative path), so without proxying you will get 404/502 or auth/cookie issues.

## Clone and Run
```bash
git clone <your-repo-url>
cd Student_Search/Frontend
npm install
npm run dev
```

Open:
- `http://localhost:3000`

## Scripts
```bash
# start local dev server
npm run dev

# production build
npm run build

# run production server after build
npm run start

# lint (first run may prompt ESLint setup if not configured yet)
npm run lint
```

## Reverse Proxy Notes (Nginx Example)
If frontend is served by Next.js and backend is separate, proxy paths like this:

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 443 ssl;
  server_name <host>;

  location /api/ {
    proxy_pass http://127.0.0.1:8000;
  }

  location /notifications/ws/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

## Optional Environment Variable
- `NEXT_PUBLIC_NOTIFICATIONS_WS_URL`
  - Optional override for websocket URL.
  - If not set, frontend defaults to:
    - `ws://<current-host>/notifications/ws/placements` (HTTP)
    - `wss://<current-host>/notifications/ws/placements` (HTTPS)

## Development Notes
- Auth uses cookies; login must succeed before websocket notifications can connect.
- Client-side caching is used for repeated route switches between `/` and `/newsFeed` to reduce duplicate fetches.
