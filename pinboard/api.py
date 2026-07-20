"""JSON API for entries, notes, image fetching and the log view."""

from __future__ import annotations

import base64
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pinboard.config import MAX_IMAGE_CHARS
from pinboard.db import db
from pinboard.log import logger

api = APIRouter(prefix="/api")

# Image types we accept for entry buttons.
_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon"}


class EntryPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=2000)
    description: str = Field(default="", max_length=2000)
    image: str = Field(default="", max_length=MAX_IMAGE_CHARS)


class NotePayload(BaseModel):
    key: str = Field(min_length=1, max_length=200)
    value: str = Field(default="", max_length=5000)


class ReorderPayload(BaseModel):
    ids: list[int]


class ImageUrlPayload(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class ConfigPayload(BaseModel):
    entries: list[EntryPayload] = Field(default_factory=list, max_length=1000)
    notes: list[NotePayload] = Field(default_factory=list, max_length=1000)


def _validate_image(image: str) -> str:
    """Only accept empty strings or well-formed image data URIs."""
    if not image:
        return ""
    if not image.startswith("data:image/") or ";base64," not in image[:64]:
        raise HTTPException(status_code=422, detail="Image must be a base64 image data URI")
    return image


# -- entries ---------------------------------------------------------------


@api.get("/entries")
def list_entries():
    return db.list_entries()


@api.post("/entries", status_code=201)
def add_entry(payload: EntryPayload):
    entry_id = db.add_entry(payload.name, payload.url, payload.description, _validate_image(payload.image))
    logger.info(f"Added entry '{payload.name}' ({payload.url})")
    return {"id": entry_id}


@api.put("/entries/{entry_id}")
def update_entry(entry_id: int, payload: EntryPayload):
    if not db.update_entry(entry_id, payload.name, payload.url, payload.description, _validate_image(payload.image)):
        raise HTTPException(status_code=404, detail="Entry not found")
    logger.info(f"Updated entry '{payload.name}' (id {entry_id})")
    return {"ok": True}


@api.delete("/entries/{entry_id}")
def delete_entry(entry_id: int):
    if not db.delete_entry(entry_id):
        raise HTTPException(status_code=404, detail="Entry not found")
    logger.info(f"Deleted entry id {entry_id}")
    return {"ok": True}


@api.post("/entries/reorder")
def reorder_entries(payload: ReorderPayload):
    db.reorder_entries(payload.ids)
    logger.debug(f"Reordered entries: {payload.ids}")
    return {"ok": True}


# -- notes -----------------------------------------------------------------


@api.get("/notes")
def list_notes():
    return db.list_notes()


@api.post("/notes", status_code=201)
def add_note(payload: NotePayload):
    note_id = db.add_note(payload.key, payload.value)
    logger.info(f"Added note '{payload.key}'")
    return {"id": note_id}


@api.put("/notes/{note_id}")
def update_note(note_id: int, payload: NotePayload):
    if not db.update_note(note_id, payload.key, payload.value):
        raise HTTPException(status_code=404, detail="Note not found")
    logger.info(f"Updated note '{payload.key}' (id {note_id})")
    return {"ok": True}


@api.delete("/notes/{note_id}")
def delete_note(note_id: int):
    if not db.delete_note(note_id):
        raise HTTPException(status_code=404, detail="Note not found")
    logger.info(f"Deleted note id {note_id}")
    return {"ok": True}


@api.post("/notes/reorder")
def reorder_notes(payload: ReorderPayload):
    db.reorder_notes(payload.ids)
    logger.debug(f"Reordered notes: {payload.ids}")
    return {"ok": True}


# -- import/export ---------------------------------------------------------


@api.get("/export")
def export_config():
    """Full dashboard config as JSON; order is preserved via list order."""
    logger.info("Exported config")
    return {
        "pinboard": 1,
        "entries": [
            {key: entry[key] for key in ("name", "url", "description", "image")} for entry in db.list_entries()
        ],
        "notes": [{key: note[key] for key in ("key", "value")} for note in db.list_notes()],
    }


@api.post("/import")
def import_config(payload: ConfigPayload):
    """Replace all entries and notes with the imported config."""
    for entry in payload.entries:
        _validate_image(entry.image)
    db.replace_all(
        [entry.model_dump() for entry in payload.entries],
        [note.model_dump() for note in payload.notes],
    )
    logger.info(f"Imported config ({len(payload.entries)} entries, {len(payload.notes)} notes)")
    return {"ok": True, "entries": len(payload.entries), "notes": len(payload.notes)}


# -- images ----------------------------------------------------------------


@api.post("/fetch-image")
def fetch_image(payload: ImageUrlPayload):
    """Download an image server-side (avoids browser CORS) and return it as a data URI."""
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="Only http(s) URLs are supported")

    try:
        request = urllib.request.Request(payload.url, headers={"User-Agent": "pinboard"})
        with urllib.request.urlopen(request, timeout=10) as response:
            content_type = response.headers.get_content_type()
            if content_type not in _ALLOWED_IMAGE_TYPES:
                raise HTTPException(status_code=422, detail=f"Not an image ({content_type})")
            data = response.read(MAX_IMAGE_CHARS)
    except HTTPException:
        raise
    except Exception as error:
        logger.warning(f"Image fetch failed for {payload.url}: {error}")
        raise HTTPException(status_code=502, detail="Could not fetch image") from error

    encoded = base64.b64encode(data).decode("ascii")
    image = f"data:{content_type};base64,{encoded}"
    if len(image) > MAX_IMAGE_CHARS:
        raise HTTPException(status_code=422, detail="Image too large (max ~2 MB)")

    logger.debug(f"Fetched image from {payload.url} ({len(data)} bytes)")
    return {"image": image}


# -- log -------------------------------------------------------------------


@api.get("/log")
def read_log(limit: int = 500):
    return logger.read_entries(limit=min(max(limit, 1), 2000))
