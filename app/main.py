"""FastAPI app: SPA shell, static content/media mounts, and the JSON API.

One process serves everything behind `tailscale serve`: the built SPA, the generated
``content/`` JSON and WebP cache, and the progress/notes endpoints. Route order
matters -- API routers first, then the static mounts, then the SPA catch-all -- so a
missing media file can never fall through to ``index.html``.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope

from app.api import (
    flashcards_drafts,
    flashcards_notes,
    flashcards_review,
    flashcards_stats,
    notes,
    progress,
)

ROOT = Path(__file__).resolve().parent.parent
WEB_DIST = ROOT / "web" / "dist"
CONTENT = ROOT / "content"

IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
CONTENT_CACHE = "public, max-age=300, must-revalidate"
SHELL_CACHE = "no-cache"


class CachedStaticFiles(StaticFiles):
    """``StaticFiles`` that stamps a ``Cache-Control`` header on successful hits.

    Media and hashed bundles are content-addressed, so they can be cached forever;
    chapter JSON changes on every publish and gets a short revalidating window.
    """

    def __init__(
        self,
        *,
        directory: Path | str,
        cache_control: str,
        check_dir: bool = True,
        html: bool = False,
    ) -> None:
        super().__init__(directory=directory, check_dir=check_dir, html=html)
        self.cache_control = cache_control

    async def check_config(self) -> None:
        # A missing directory must be a 404, not a boot failure: ``content/media``
        # may not exist yet and the service can start before the first build.
        try:
            await super().check_config()
        except RuntimeError:
            return

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code in (200, 304):
            response.headers["cache-control"] = self.cache_control
        return response


def _is_within(path: Path, root: Path) -> bool:
    """True when ``path`` resolves inside ``root`` (no ``..`` escape)."""
    try:
        path.relative_to(root.resolve())
    except ValueError:
        return False
    return True


def create_app(
    web_dist: Path | None = None,
    content_dir: Path | None = None,
) -> FastAPI:
    """Build the app around a SPA build directory and a content directory.

    The arguments exist so tests and the publish step can point the same code at a
    throwaway build instead of the real ``web/dist`` and ``content``.
    """
    dist = (Path(web_dist) if web_dist is not None else WEB_DIST).resolve()
    content = (Path(content_dir) if content_dir is not None else CONTENT).resolve()

    application = FastAPI(title="Estudos", docs_url=None, redoc_url=None)

    @application.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    application.include_router(progress.router)
    application.include_router(notes.router)
    application.include_router(flashcards_drafts.router)
    application.include_router(flashcards_notes.router)
    application.include_router(flashcards_review.router)
    application.include_router(flashcards_stats.router)

    application.mount(
        "/content",
        CachedStaticFiles(
            directory=content, check_dir=False, cache_control=CONTENT_CACHE
        ),
        name="content",
    )
    application.mount(
        "/media",
        CachedStaticFiles(
            directory=content / "media",
            check_dir=False,
            cache_control=IMMUTABLE_CACHE,
        ),
        name="media",
    )
    application.mount(
        "/assets",
        CachedStaticFiles(
            directory=dist / "assets",
            check_dir=False,
            cache_control=IMMUTABLE_CACHE,
        ),
        name="assets",
    )

    @application.api_route(
        "/{full_path:path}",
        methods=["GET", "HEAD"],
        include_in_schema=False,
        response_model=None,
    )
    def spa(full_path: str) -> Response:
        # An unknown API path is a bug in the client, never the SPA shell.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (dist / full_path).resolve()
            if _is_within(candidate, dist) and candidate.is_file():
                return FileResponse(
                    candidate, headers={"cache-control": SHELL_CACHE}
                )

        index = dist / "index.html"
        if _is_within(index, dist) and index.is_file():
            return FileResponse(index, headers={"cache-control": SHELL_CACHE})

        return JSONResponse({"detail": "SPA not built yet"}, status_code=503)

    return application


app = create_app()
