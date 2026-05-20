"""Worker module for processing embedding tasks asynchronously.

    Runs as a separate container (docker-compose: worker service)
    
"""

import asyncio
import signal

from src.db import database, init_db
from src.container import Container
from src.infrastructure.services.task_store import EmbeddingTaskStore, TaskStatus

POLL_INTERVAL = 2  # sekundy


async def process_task(
    task: dict,
    task_store: EmbeddingTaskStore,
    chunk_service: object,
) -> None:
    """Process a single embedding task.

    The task is already in RUNNING state (claimed atomically).

    Args:
        task: The task dict from the database.
        task_store: The task store for status updates.
        chunk_service: The chunk service for embedding generation.
    """
    task_id = task["id"]
    document_id = task["document_id"]
    model_name = task["model_name"]

    print(f"[worker] Przetwarzanie zadania {task_id} "
          f"(doc={document_id}, model={model_name})")

    try:
        count = await chunk_service.generate_embeddings(
            document_id, model_name,
        )
        await task_store.update_task(
            task_id,
            status=TaskStatus.DONE,
            chunks_processed=count,
        )
        print(f"[worker] Zadanie {task_id} zakończone — "
              f"przetworzono {count} chunków")
    except Exception as e:
        await task_store.update_task(
            task_id,
            status=TaskStatus.FAILED,
            error=str(e),
        )
        print(f"[worker] Zadanie {task_id} nie powiodło się: {e}")


async def worker_loop() -> None:
    """Main worker loop, polls DB for pending tasks."""

    print("[worker] Inicjalizacja bazy danych...")
    await init_db()
    await database.connect()

    container = Container()
    task_store = EmbeddingTaskStore()
    chunk_service = container.chunk_service()

    print("[worker] Uruchomiony — oczekiwanie na zadania...")

    running = True

    def handle_shutdown(sig: int, frame: object) -> None:
        nonlocal running
        print(f"\n[worker] Otrzymano sygnał {sig}, zamykanie...")
        running = False

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        while running:
            try:
                task = await task_store.claim_next_task()

                while task is not None and running:
                    await process_task(task, task_store, chunk_service)
                    task = await task_store.claim_next_task()

            except Exception as e:
                print(f"[worker] Błąd w pętli: {e}")

            await asyncio.sleep(POLL_INTERVAL)

    finally:
        await database.disconnect()
        print("[worker] Zamknięty.")


def main() -> None:
    """Entry point for the worker module."""

    print("[worker] Start modułu worker")
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
