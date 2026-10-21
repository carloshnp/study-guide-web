"""T17: static mounts, cache headers, and the SPA fallback."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from tests.api.conftest import INDEX_HTML

DEEP_ROUTE = "/g/aluminio/c/04-solucao-solida"
IMMUTABLE = "max-age=31536000"


def test_root_serves_the_spa_shell(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.text == INDEX_HTML
    assert "no-cache" in response.headers["cache-control"]


def test_explicit_index_html_is_served(client: TestClient) -> None:
    response = client.get("/index.html")

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_deep_route_serves_index_html(client: TestClient) -> None:
    response = client.get(DEEP_ROUTE)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.text == INDEX_HTML


def test_deep_route_head_request_serves_index_html(client: TestClient) -> None:
    response = client.head(DEEP_ROUTE)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")


def test_unknown_top_level_route_falls_back_to_the_spa(client: TestClient) -> None:
    response = client.get("/busca")

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_hashed_assets_are_cached_forever(client: TestClient) -> None:
    response = client.get("/assets/index-abc123.js")

    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]
    assert IMMUTABLE in response.headers["cache-control"]
    assert "immutable" in response.headers["cache-control"]


def test_content_json_is_served_and_cacheable(client: TestClient) -> None:
    response = client.get("/content/index.json")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "public" in response.headers["cache-control"]
    assert "max-age=300" in response.headers["cache-control"]


def test_media_is_served_with_long_cache(client: TestClient) -> None:
    response = client.get("/media/abc123/1280.webp")

    assert response.status_code == 200
    assert response.content == b"RIFF-fake-webp"
    assert IMMUTABLE in response.headers["cache-control"]


def test_missing_media_returns_404_not_the_spa(client: TestClient) -> None:
    response = client.get("/media/abc123/9999.webp")

    assert response.status_code == 404
    assert response.text != INDEX_HTML
    assert not response.headers["content-type"].startswith("text/html")


def test_missing_content_file_returns_404(client: TestClient) -> None:
    response = client.get("/content/guides/nao-existe/guide.json")

    assert response.status_code == 404
    assert response.text != INDEX_HTML


def test_unknown_api_route_returns_json_404(client: TestClient) -> None:
    response = client.get("/api/nao-existe")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    assert response.text != INDEX_HTML


def test_path_traversal_never_serves_a_project_file(client: TestClient) -> None:
    response = client.get("/assets/%2e%2e/%2e%2e/app/main.py")

    assert "from __future__" not in response.text
    assert response.status_code in {200, 404}
    if response.status_code == 200:
        assert response.text == INDEX_HTML


def test_media_mount_survives_a_missing_content_directory(tmp_path: Path) -> None:
    app = create_app(web_dist=tmp_path / "dist", content_dir=tmp_path / "no-content")

    with TestClient(app) as client:
        response = client.get("/media/abc123/1280.webp")

    assert response.status_code == 404
    assert not response.headers["content-type"].startswith("text/html")


def test_missing_spa_build_reports_503(tmp_path: Path, content_dir: Path) -> None:
    app = create_app(web_dist=tmp_path / "empty-dist", content_dir=content_dir)

    with TestClient(app) as client:
        response = client.get(DEEP_ROUTE)

    assert response.status_code == 503
    assert response.json() == {"detail": "SPA not built yet"}


def test_health_still_answers(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}
