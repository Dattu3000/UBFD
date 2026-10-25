---
phase: 1
plan: 2
wave: 2
gap_closure: false
---

# Plan 1.2: Authentication, Tenant Context & Entity/Account API Endpoints

## Objective
Build out the authentication flow, tenant-scoped dependency injection, Pydantic v2 validation schemas, and RESTful endpoints for managing business entities and bank accounts under strict tenant isolation.

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ARCHITECTURE.md`
- `backend/app/models/__init__.py`
- `ubfd_engineering_project_report.md`

## Tasks

<task type="auto" effort="medium">
  <name>Implement Pydantic Schemas and Security Layer</name>
  <files>
    backend/app/core/security.py
    backend/app/api/dependencies.py
    backend/app/schemas/auth_schema.py
    backend/app/schemas/account_schema.py
  </files>
  <action>
    1. Implement `app/core/security.py` with password hashing (`verify_password`, `get_password_hash`) and JWT token creation (`create_access_token`, `decode_access_token`).
    2. Implement `app/schemas/auth_schema.py` (`Token`, `TokenPayload`, `LoginRequest`, `UserContext`).
    3. Implement `app/schemas/account_schema.py` (`EntityCreate`, `EntityOut`, `BankAccountCreate`, `BankAccountOut`, `AccountSummaryTile`).
    4. Implement `app/api/dependencies.py` with `get_current_tenant` and `get_current_user` extracting Bearer JWT tokens, validating claims, and setting tenant RLS context on the active async database session.

    AVOID: Returning plain password hashes or raw DB entities without schema serialization.
    USE: Pydantic v2 `model_config = ConfigDict(from_attributes=True)` for seamless SQLAlchemy conversion.
  </action>
  <verify>
    python -c "import sys; sys.path.insert(0, 'backend'); from app.core.security import create_access_token, decode_access_token; t = create_access_token({'sub': 'test', 'tenant_id': '00000000-0000-0000-0000-000000000001'}); payload = decode_access_token(t); assert payload['sub'] == 'test'; print('Security token tests passed')"
  </verify>
  <done>
    JWT creation, verification, and Pydantic validation schemas pass all assertions.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Build FastAPI App, API v1 Router & Account/Entity Endpoints</name>
  <files>
    backend/app/api/v1/endpoints/auth.py
    backend/app/api/v1/endpoints/accounts.py
    backend/app/api/v1/router.py
    backend/app/main.py
    backend/tests/test_accounts.py
  </files>
  <action>
    1. Implement `app/api/v1/endpoints/auth.py` providing `/login` (issues JWT with demo/prod credentials) and `/me` (returns current user & tenant profile).
    2. Implement `app/api/v1/endpoints/accounts.py` providing:
       - `GET /entities`: List legal entities for current tenant
       - `POST /entities`: Register new entity
       - `GET /accounts`: List all bank accounts across entities
       - `GET /accounts/{account_id}`: Retrieve bank account details & cleared balance
       - `POST /accounts`: Link a new commercial bank account
    3. Implement `app/api/v1/router.py` aggregating auth and accounts sub-routers.
    4. Implement `app/main.py` creating the FastAPI application, CORS middleware, lifespan database table initialization, and API v1 mounting.
    5. Write `tests/test_accounts.py` using `pytest` and `httpx.AsyncClient` validating entity creation, account listing, and tenant isolation.

    AVOID: Leaking entities between tenants.
    USE: Strict `WHERE tenant_id == current_tenant.id` clauses across all queries.
  </action>
  <verify>
    pytest backend/tests/test_accounts.py -v
  </verify>
  <done>
    `test_accounts.py` executes with 100% pass rate validating auth and account management.
  </done>
</task>
