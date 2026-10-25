import sys
sys.path.insert(0, ".")

import asyncio
import datetime
import time
import uuid

from app.core.database import async_session_factory, init_db
from app.core.seeder import seed_demo_data_if_empty
from app.services.daily_calculator import DailyCashInspectorService


async def run_benchmark():
    await init_db()
    async with async_session_factory() as session:
        await seed_demo_data_if_empty(session)
        service = DailyCashInspectorService(session)
        account_id = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        target_date = datetime.date(2026, 10, 25)

        # Warm up
        await service.get_daily_metrics(account_id, target_date)

        timings = []
        for _ in range(50):
            t0 = time.perf_counter()
            await service.get_daily_metrics(account_id, target_date)
            elapsed_ms = (time.perf_counter() - t0) * 1000
            timings.append(elapsed_ms)

        avg_ms = sum(timings) / len(timings)
        p95_ms = sorted(timings)[int(len(timings) * 0.95)]
        min_ms = min(timings)
        max_ms = max(timings)

        print("=== DAILY CASH INSPECTOR LATENCY BENCHMARK ===")
        print(f"Iterations      : {len(timings)}")
        print(f"Target Account  : {account_id}")
        print(f"Target Date     : {target_date}")
        print(f"Average Latency : {avg_ms:.3f} ms")
        print(f"p95 Latency     : {p95_ms:.3f} ms")
        print(f"Min Latency     : {min_ms:.3f} ms")
        print(f"Max Latency     : {max_ms:.3f} ms")
        print(f"SLA Target      : < 150.000 ms")
        verdict = "PASS - SUB-150MS SLA MET" if p95_ms < 150 else "FAIL"
        print(f"Verdict         : {verdict}")


if __name__ == "__main__":
    asyncio.run(run_benchmark())
