# Syntra Backend

Syntra Backend is the server-side API and real-time data relay layer for the Syntra trading platform.
It centralizes external market data integrations, protects provider API keys, caches expensive requests, and distributes real-time updates to connected frontend clients.

Frontend repository: [Syntra Frontend](https://github.com/Pacnatz/Syntra-Frontend)

## What This Backend Does Today

- Serves REST endpoints for stock search and historical candle data.
- Connects to Finnhub WebSocket once at the server level and forwards updates to connected clients.
- Manages Socket.IO stock rooms (`joinStockRoom`, `leaveStockRoom`) so clients receive symbol-specific live updates.
- Caches search responses and stock candles to reduce external API calls and rate-limit pressure.
- Applies interval-based TTL strategy for stock candle cache freshness.
- Handles provider error cases such as API rate limiting (HTTP 429) and returns backend-safe responses.

## Tech Stack

### Core

- Node.js
- Express 5
- Socket.IO 4

### Integrations

- Finnhub REST search API
- Finnhub WebSocket trade stream
- Twelve Data time series API

### Utilities / Runtime

- dotenv
- cors
- nodemon (development)

## Architecture

### Entry Point

- `app.js`
  - Loads environment variables early (`dotenv.config()`)
  - Configures CORS + JSON middleware
  - Mounts API routes at `/api`
  - Starts HTTP server
  - Initializes Socket.IO and starts upstream Finnhub socket service

### Routing Layer

- `routes/index.js`
  - Mounts `search` and `stock` route groups
- `routes/search.js`
  - `GET /api/search?q=...`
- `routes/stock.js`
  - `GET /api/stock/:symbol/:interval`

### Controllers

- `controllers/search.js`
  - Calls Finnhub search endpoint
  - Filters symbol results (uppercase and no dot symbols)
  - Caches results in-memory (max 100)
- `controllers/stock.js`
  - Calls Twelve Data time series endpoint
  - Builds interval-specific start date and cache TTL
  - Caches candle responses by `symbol_interval`
  - Handles weekend logic for 1-minute data start date

### Real-Time Layer

- `sockets/index.js`
  - Handles client socket connect/disconnect
  - Joins/leaves symbol rooms
  - Triggers upstream subscribe/unsubscribe decisions
- `services/finnhubSocket.js`
  - Owns single upstream Finnhub WebSocket connection
  - Tracks active symbols server-wide
  - Broadcasts `stockPriceUpdate` to matching Socket.IO rooms
  - Reconnects automatically on close

## API Routes

### Health / Root

- `GET /`
  - Returns basic server message

### Search

- `GET /api/search?q=<query>`
  - Source: Finnhub search API
  - Returns filtered stock symbols
  - Uses in-memory response cache

### Stock Candles

- `GET /api/stock/:symbol/:interval`
  - Source: Twelve Data time series API
  - Supported intervals: `1min`, `5min`, `1h`, `1day`
  - Uses interval-based cache TTL
  - Returns payload with data + cache log metadata

## Socket Events

### Client -> Server

- `joinStockRoom` (symbol)
  - Joins socket room and subscribes upstream symbol if needed
- `leaveStockRoom` (symbol)
  - Leaves room and unsubscribes upstream symbol when room is empty

### Server -> Client

- `stockPriceUpdate`
  - Emits `{ symbol, price, time, volume }` for room subscribers

## Implemented Behaviors (In Depth)

### 1. Centralized Provider Key Security

- External provider keys are never exposed to frontend clients.
- All Finnhub and Twelve Data requests are executed from the backend.

### 2. Rate-Limit Mitigation via Caching

- Search cache stores up to 100 entries.
- Stock cache stores up to 100 symbol/interval entries with per-interval TTLs:
  - `1min` -> 60s
  - `5min` -> 300s
  - `1h` -> 3600s
  - `1day` -> 86400s

### 3. Shared Upstream WebSocket Design

- Backend opens one Finnhub WebSocket connection and fans out updates to all clients.
- Prevents each browser from opening its own provider socket and hitting limits faster.

### 4. Market-Time Data Handling

- `1min` interval start date logic adjusts for weekends to avoid querying non-trading days.
- Historical and live feeds are structured so frontend can merge candles with realtime ticks.

## Environment Variables

Create a `.env` file in `server/`:

```env
PORT=3001
CLIENT_URL=http://localhost:3000
FINNHUB_API_KEY=your_finnhub_api_key
TWELVEDATA_API_KEY=your_twelvedata_api_key
```

## Local Development

```bash
cd server
npm install
npm run dev
```

Frontend proxy should point to this backend on port `3001`.

## Work Still To Finish

### Product Features

- Add persistent database layer for users, watchlists, chat messages, and chart annotations.
- Add auth endpoints (signup/login/logout/session/refresh).
- Add user profile endpoints for avatar/settings management.
- Add chat room APIs and socket events for collaborative messaging.

### Data + Reliability

- Add request validation and normalized error response schema.
- Add retry/backoff and better failure handling for upstream provider errors.
- Remove temporary symbol remap logic used for aftermarket testing.
- Strengthen cache observability (hit/miss metrics, eviction metrics, memory usage).

### Engineering Quality

- Add unit/integration tests for controllers, socket room behavior, and cache logic.
- Add lint/format scripts and CI checks.
- Add structured logging and log levels for production diagnostics.

## Challenges Encountered

### 1. Finnhub Historical Data Limitation

- Finnhub historical candles are not fully available on the intended free usage path.
- Twelve Data was integrated for historical candles while Finnhub remains the realtime source.

### 2. Rate Limits Across Multiple Providers

- Frequent symbol/interval requests can exhaust API quotas quickly.
- In-memory caches and TTL tuning were required to keep the app responsive.

### 3. Timestamp Alignment Between Providers

- Historical candle timestamps and live trade timestamps were not perfectly aligned.
- Frontend/backend flow required normalization logic so realtime candle updates remain coherent.

### 4. Real-Time Room Subscription Timing

- Direct navigation and connection timing can cause room-join race conditions.
- Current architecture mitigates this, but further hardening remains in backlog.

## Current Status

The backend is functional as a real-time market data relay and REST API layer for Syntra's prototype stage.
Core collaboration and persistent account features are still in progress.
