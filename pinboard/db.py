"""SQLite storage for entries and notes.

Everything lives in one sqlite file inside the instance directory: the button
entries (with images stored as base64 data URIs) and the key/value notes. A
single shared connection behind a lock is plenty for a small dashboard.
"""

from __future__ import annotations

import os
import sqlite3
import threading

_SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL DEFAULT 0,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT ''
);
"""


class Database:
    def __init__(self):
        self._conn: sqlite3.Connection | None = None
        self._lock = threading.Lock()

    def init_pinboard(self, instance_path: str) -> None:
        dbfile = os.path.join(instance_path, "pinboard.db")
        self._conn = sqlite3.connect(dbfile, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def _execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        assert self._conn is not None, "Database not initialized"
        cursor = self._conn.execute(sql, params)
        self._conn.commit()
        return cursor

    def _query(self, sql: str, params: tuple = ()) -> list[dict]:
        assert self._conn is not None, "Database not initialized"
        return [dict(row) for row in self._conn.execute(sql, params).fetchall()]

    # -- entries -----------------------------------------------------------

    def list_entries(self) -> list[dict]:
        with self._lock:
            return self._query("SELECT * FROM entries ORDER BY position, id")

    def add_entry(self, name: str, url: str, description: str, image: str) -> int:
        with self._lock:
            position = self._query("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM entries")[0]["next"]
            cursor = self._execute(
                "INSERT INTO entries (position, name, url, description, image) VALUES (?, ?, ?, ?, ?)",
                (position, name, url, description, image),
            )
            return cursor.lastrowid

    def update_entry(self, entry_id: int, name: str, url: str, description: str, image: str) -> bool:
        with self._lock:
            cursor = self._execute(
                "UPDATE entries SET name = ?, url = ?, description = ?, image = ? WHERE id = ?",
                (name, url, description, image, entry_id),
            )
            return cursor.rowcount > 0

    def delete_entry(self, entry_id: int) -> bool:
        with self._lock:
            return self._execute("DELETE FROM entries WHERE id = ?", (entry_id,)).rowcount > 0

    def reorder_entries(self, ids: list[int]) -> None:
        with self._lock:
            for position, entry_id in enumerate(ids):
                self._execute("UPDATE entries SET position = ? WHERE id = ?", (position, entry_id))

    # -- notes -------------------------------------------------------------

    def list_notes(self) -> list[dict]:
        with self._lock:
            return self._query("SELECT * FROM notes ORDER BY position, id")

    def add_note(self, key: str, value: str) -> int:
        with self._lock:
            position = self._query("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM notes")[0]["next"]
            cursor = self._execute("INSERT INTO notes (position, key, value) VALUES (?, ?, ?)", (position, key, value))
            return cursor.lastrowid

    def update_note(self, note_id: int, key: str, value: str) -> bool:
        with self._lock:
            cursor = self._execute("UPDATE notes SET key = ?, value = ? WHERE id = ?", (key, value, note_id))
            return cursor.rowcount > 0

    def delete_note(self, note_id: int) -> bool:
        with self._lock:
            return self._execute("DELETE FROM notes WHERE id = ?", (note_id,)).rowcount > 0

    def reorder_notes(self, ids: list[int]) -> None:
        with self._lock:
            for position, note_id in enumerate(ids):
                self._execute("UPDATE notes SET position = ? WHERE id = ?", (position, note_id))

    # -- import/export -------------------------------------------------------

    def replace_all(self, entries: list[dict], notes: list[dict]) -> None:
        """Wipe both tables and insert the given data (used by config import)."""
        with self._lock:
            self._execute("DELETE FROM entries")
            self._execute("DELETE FROM notes")
            for position, entry in enumerate(entries):
                self._execute(
                    "INSERT INTO entries (position, name, url, description, image) VALUES (?, ?, ?, ?, ?)",
                    (position, entry["name"], entry["url"], entry["description"], entry["image"]),
                )
            for position, note in enumerate(notes):
                self._execute(
                    "INSERT INTO notes (position, key, value) VALUES (?, ?, ?)",
                    (position, note["key"], note["value"]),
                )


db = Database()
