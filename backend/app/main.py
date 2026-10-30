from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.middleware import ZeroTrustSecurityMiddleware
from app.core.config import settings
from app.core.database import init_db, async_session_factory
from app.core.seeder import seed_demo_data_if_empty
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB schemas
    await init_db()
    
    # 2. Seed demo data if in demo mode
    if settings.DEMO_MODE:
        async with async_session_factory() as session:
            await seed_demo_data_if_empty(session)
            
    yield


docs_url = f"{settings.API_V1_STR}/docs" if settings.ENABLE_PUBLIC_DOCS else None
redoc_url = f"{settings.API_V1_STR}/redoc" if settings.ENABLE_PUBLIC_DOCS else None
openapi_url = f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_PUBLIC_DOCS else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=openapi_url,
    docs_url=docs_url,
    redoc_url=redoc_url,
    lifespan=lifespan,
)

# 1. Zero-Trust Security Headers Middleware (OWASP Top 10, HSTS, CSP, Clickjacking mitigation)
app.add_middleware(ZeroTrustSecurityMiddleware)

# 2. Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "api_version": "v1",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Unified Business Finance Dashboard (UBFD) / Group Cash OS API",
        "docs": f"{settings.API_V1_STR}/docs",
    }
