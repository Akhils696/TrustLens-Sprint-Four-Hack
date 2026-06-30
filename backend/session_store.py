"""
TrustLens – In-memory session store.

Stores DocumentRecord objects keyed by document_id.
All data is lost when the server restarts — no database, by design.
Thread-safe via a simple dict (FastAPI runs in a single async event loop).
"""
from __future__ import annotations

from typing import Optional
from models import DocumentRecord


class SessionStore:
    """Singleton-style in-memory store for document records."""

    def __init__(self) -> None:
        self._store: dict[str, DocumentRecord] = {}

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def save(self, record: DocumentRecord) -> None:
        """Insert or update a document record."""
        self._store[record.document_id] = record

    def get(self, document_id: str) -> Optional[DocumentRecord]:
        """Return a document record or None if not found."""
        return self._store.get(document_id)

    def get_or_raise(self, document_id: str) -> DocumentRecord:
        """Return a document record or raise KeyError."""
        record = self._store.get(document_id)
        if record is None:
            raise KeyError(f"Document '{document_id}' not found in session.")
        return record

    def delete(self, document_id: str) -> None:
        """Remove a document record from the store."""
        self._store.pop(document_id, None)

    def all_ids(self) -> list[str]:
        """Return all document IDs currently in the store."""
        return list(self._store.keys())

    def count(self) -> int:
        return len(self._store)


# Module-level singleton — imported by main.py
store = SessionStore()
