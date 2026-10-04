"""
scheduler.py — Periodic evaluation job.

Runs evaluate_all(), persists results via results_store, and logs the outcome.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

from evaluator import evaluate_all
from results_store import save_evaluation, ensure_indexes

scheduler = BackgroundScheduler(timezone="UTC")


def run_evaluation_job():
    """Run the full pipeline and persist results."""
    started = datetime.utcnow()
    print(f"[scheduler] starting evaluation at {started.isoformat()}")

    try:
        result = evaluate_all()
        if result is None:
            print("[scheduler] no data available")
            return

        consumers = result.get("consumers")
        dts       = result.get("dts")
        n_consumers = 0 if consumers is None else len(consumers)
        n_dts       = 0 if dts is None else len(dts)

        print(f"[scheduler] scored {n_consumers} consumers, {n_dts} DTs")

        saved = save_evaluation(result)
        elapsed = (datetime.utcnow() - started).total_seconds()
        print(f"[scheduler] saved {saved['consumers_saved']} consumer docs, "
              f"{saved['dts_saved']} DT docs in {elapsed:.1f}s")

    except Exception as e:
        import traceback
        print(f"[scheduler] error: {e}")
        traceback.print_exc()


def start_scheduler(interval_days: int = 7, run_now: bool = True):
    """Start the background scheduler."""
    ensure_indexes()

    scheduler.add_job(
        run_evaluation_job,
        "interval",
        days=interval_days,
        id="weekly_evaluation",
        replace_existing=True,
    )

    scheduler.start()
    print(f"[scheduler] started — interval = {interval_days} days")

    if run_now:
        print("[scheduler] running initial evaluation")
        run_evaluation_job()

    return scheduler


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[scheduler] stopped")