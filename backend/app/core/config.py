import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Unified Business Finance Dashboard (UBFD) / Group Cash OS"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "ubfd-dev-super-secret-key-change-in-production-2026-financial-os"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database (Dual mode: SQLite async for local zero-dependency testing, PostgreSQL async for production)
    DATABASE_URL: str = "sqlite+aiosqlite:///./ubfd.db"
    
    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    DEMO_MODE: bool = True

    # Account Aggregator (RBI AA / ReBIT Architecture - Setu / Finvu / OneMoney)
    AA_PROVIDER: str = "SANDBOX"  # or "SETU", "FINVU", "ONEMONEY"
    AA_CLIENT_ID: str = ""
    AA_CLIENT_SECRET: str = ""
    AA_BASE_URL: str = "https://fiu-sandbox.setu.co"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
