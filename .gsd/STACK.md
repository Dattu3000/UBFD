# Technology Stack

> Unified Business Finance Dashboard (UBFD) / Group Cash OS

## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12+ (Installed: 3.14.0) | High-performance backend financial computing & document parsing |
| Node.js | v24.11.1 (npm 11.6.2) | Frontend runtime for Next.js 15 & build tooling |
| PostgreSQL / SQLite | 16 (PostgreSQL) / 3 (SQLite Async) | Primary relational database with multi-tenant RLS / Local dev testing |
| Redis | 7.x (or eager memory broker) | Session caching, summary cache, idempotency locks, task broker |

---

## Backend Stack & Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | ^0.115.0 | Async web framework with ASGI performance |
| `pydantic` | ^2.9.0 | Data validation, settings management (`pydantic-settings`) |
| `uvicorn` | ^0.32.0 | High-performance ASGI server |
| `sqlalchemy` | ^2.0.36 | Async ORM & SQL expression query engine |
| `aiosqlite` | ^0.20.0 | Async SQLite driver for zero-dependency local dev & testing |
| `asyncpg` | ^0.30.0 | Production high-throughput PostgreSQL async driver |
| `alembic` | ^1.13.3 | Database schema migrations |
| `python-jose` / `pyjwt` | ^3.3.0 | JWT authentication and session token validation |
| `passlib` / `bcrypt` | ^1.7.4 | Password hashing for local users |
| `pdfplumber` | ^0.11.4 | High-precision table extraction from bank statement PDFs |
| `pypdf` / `pymupdf` | ^4.0.0 | PDF metadata extraction, fallback text stream parser |
| `pytest` | ^8.3.0 | Unit and integration testing |
| `pytest-asyncio` | ^0.24.0 | Async test runner |
| `httpx` | ^0.27.2 | Async HTTP client for test suite and external bank API calls |

---

## Frontend Stack & Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.x | React framework with App Router, SSR, and API routes |
| `react` / `react-dom` | 19.x | Core UI library |
| `typescript` | ^5.6.0 | Static typing across financial contracts and API payloads |
| `@tanstack/react-query` | ^5.59.0 | Server state synchronization, caching, and background revalidation |
| `@tanstack/react-table` | ^8.20.0 | Virtualized table grid for 5,000+ transaction lines |
| `tailwindcss` | ^3.4.0 | Utility-first CSS styling and financial theme tokens |
| `@radix-ui/react-*` | Latest | Accessible unstyled UI primitives (Dialog, Popover, Select, Tabs) |
| `chart.js` & `react-chartjs-2` | ^4.4.0 / ^5.2.0 | Canvas-based financial waterfall and cash flow charts (<200ms) |
| `lucide-react` | ^0.450.0 | Icon set for banking, ledger, navigation, and indicators |
| `clsx` & `tailwind-merge` | Latest | Conditional className merging for financial UI components |
| `date-fns` | ^4.1.0 | Date arithmetic and formatting |

---

## Configuration Variables

| Variable | Purpose | Default / Location |
|----------|---------|---------------------|
| `DATABASE_URL` | Async database connection string | `sqlite+aiosqlite:///./ubfd.db` or `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis cache and queue broker URL | `redis://localhost:6379/0` (fallback: memory) |
| `SECRET_KEY` | HMAC key for signing JWT auth tokens | `.env` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session validity duration | `1440` (24 hours) |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL for client | `http://localhost:8000` |
