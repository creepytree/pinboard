"""FastAPI application for pinboard.

Initializes the app with static file serving, sqlite storage and route
registration. Imported only after the environment is final (see
``pinboard.start``), because configuration is read at import time.
The app shell (design assets, templates, login/session) comes from the
druids framework via ``pinboard.shell``.
"""

import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from pinboard.api import api
from pinboard.config import BASE_PATH
from pinboard.db import db
from pinboard.env import env
from pinboard.log import logger
from pinboard.routes import pages
from pinboard.shell import druids

# INSTANCE_DIR for system installs to keep the db and logs outside the package
# directory (may not be writable).
instance_path = env.instance_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance")
os.makedirs(instance_path, exist_ok=True)


class BasePathMiddleware:
    """Allow BASE_PATH routing with or without proxy prefix stripping."""

    def __init__(self, app, base_path: str):
        self.app = app
        self.base_path = base_path
        path_parts = [part for part in base_path.split("/") if part]
        self.base_path_candidates = ["/" + "/".join(path_parts[index:]) for index in range(len(path_parts))]

    async def __call__(self, scope, receive, send):
        if self.base_path and scope["type"] in {"http", "websocket"}:
            path = scope.get("path", "")
            for base_path in self.base_path_candidates:
                if path == base_path:
                    scope = {**scope, "path": "/"}
                    break
                if path.startswith(f"{base_path}/"):
                    scope = {**scope, "path": path[len(base_path) :]}
                    break

        await self.app(scope, receive, send)


# BasePathMiddleware handles BASE_PATH; setting FastAPI.root_path too breaks StaticFiles behind stripping proxies.
app = FastAPI(title="pinboard")
# druids installs its assets, login routes and auth middleware app-relative.
# BasePathMiddleware is added after so it runs first (middleware runs
# outermost-last-added first) and auth only ever sees stripped paths.
druids.install(app)
app.add_middleware(BasePathMiddleware, base_path=BASE_PATH)

logger.init_pinboard(instance_path)
db.init_pinboard(instance_path)

if druids.login_enabled:
    logger.info(f"Login enabled (user '{env.login_user}', timeout {env.login_timeout} min)")

static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

app.include_router(api)
app.include_router(pages)

logger.info("pinboard started")
