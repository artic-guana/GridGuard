# CORS Architecture and Proxying Strategy

## 1. Why We Proxy Through Next.js

In this architecture, all client-side web requests are routed through Next.js via `/api/backend/[...path]`.

- **Security & Secret Isolation**: The upstream `FASTAPI_URL` environment variable remains server-side and is never exposed to client browsers or bundled into client code.
- **Unified Domain (Same-Origin Policy)**: By calling `/api/backend/*`, all requests originate from the same domain (`http://localhost:3000`) as the web app. This avoids cross-origin browser restrictions altogether during standard app usage.
- **Control & Auditability**: Next.js App Router route handlers act as an API gateway, allowing centralized logging, caching, payload transformation, or header manipulation.

---

## 2. When CORS Is Actually Needed

Cross-Origin Resource Sharing (CORS) is a browser security mechanism enforced exclusively when a web application running in a web browser sends cross-origin HTTP requests (e.g. from `http://localhost:3000`) directly to a backend API running on a different domain or port (e.g. `http://localhost:8000`).

In our architecture:
- Browser requests go to `/api/backend/*` (same origin -> CORS checks are not triggered).
- Next.js server forwards requests to `FASTAPI_URL` via server-to-server HTTP calls (server-to-server calls do NOT enforce browser CORS rules).

Therefore, under standard proxied operations, browser CORS header checks on FastAPI are not triggered.

---

## 3. Why We Still Add CORS as a Safety Net

We still configure `CORSMiddleware` in FastAPI as a defense-in-depth safety net:

1. **Direct Browser Operations & Inspection**: Allows developers or administrative dashboards to connect directly to `http://localhost:8000` via Swagger UI, Postman, or local admin scripts without triggering browser access blocks.
2. **Future Architecture Decoupling**: If mobile apps or external frontends need to query the FastAPI backend directly, CORS is already pre-configured for trusted origins (`localhost:3000`, `localhost:3001`, `127.0.0.1:3000`).
3. **Environment Security**: CORS middleware explicitly restricts origins to trusted developer endpoints rather than using unsafe wildcard `allow_origins=["*"]` configurations in production settings.
