from fastapi import APIRouter
from app.api.v1.endpoints import auth, accounts, daily_ledger, intercompany, ingestion, account_aggregator

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(accounts.router)
api_router.include_router(daily_ledger.router)
api_router.include_router(intercompany.router)
api_router.include_router(ingestion.router)
api_router.include_router(account_aggregator.router)
