"""Publish tests: layout, smoke checks, and the atomic-swap reader invariant.

The important one is :func:`test_concurrent_reader_never_sees_a_partial_tree`: a
reader that resolves ``current`` once per iteration and then reads the whole tree
must always find a self-consistent build. A second version is published while the
reader loops over a tree large enough that the copy takes long enough to overlap.
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path

import pytest

from pipeline import publish as publish_module
from pipeline.publish import PublishError, publish, smoke_check


def webp(payload: bytes) -> bytes:
    """Minimal bytes with the RIFF/WEBP magic ``smoke_check`` enforces."""
    body = payload + b"\x00" * (8 - len(payload) % 8)
    return b"RIFF" + (len(body) + 4).to_bytes(4, "little") + b"WEBP" + body


def make_source(
    root: Path,
    marker: str,
    *,
    filler_files: int = 0,
    chapter_image: str | None = None,
) -> tuple[Path, Path]:
    """A SPA build plus a content tree tagged with ``marker`` everywhere."""
    dist = root / "web" / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "fonts").mkdir(parents=True)
    (dist / "index.html").write_text(
        '<!doctype html><html><body><div id="root"></div>'
        '<script type="module" src="/assets/index-ABC123.js"></script></body></html>',
        encoding="utf-8",
    )
    (dist / "assets" / "index-ABC123.js").write_text(f"// {marker}\n", encoding="utf-8")
    (dist / "fonts" / "montserrat.woff2").write_bytes(b"wOF2" + marker.encode())

    content = root / "content"
    guide = content / "guides" / "aluminio"
    chapters = guide / "chapters"
    chapters.mkdir(parents=True)
    media = content / "media" / marker
    media.mkdir(parents=True)
    (media / "1280.webp").write_bytes(webp(marker.encode()))
    image_src = f"/media/{marker}/1280.webp"

    chapter = {
        "id": "01-intro",
        "guideId": "aluminio",
        "number": 1,
        "title": f"Introdução {marker}",
        "slug": "01-intro",
        "markdown": f"## 1. Introdução {marker}\n\nTexto.\n",
        "sections": [],
        "images": [
            {
                "src": image_src if chapter_image is None else chapter_image,
                "srcset": image_src,
                "width": 1280,
                "height": 720,
                "alt": "figura",
                "original": f"/media/{marker}/original.png",
            }
        ],
    }
    (chapters / "01-intro.json").write_text(
        json.dumps(chapter, ensure_ascii=False), encoding="utf-8"
    )
    (chapters / "02-b.json").write_text(
        json.dumps({**chapter, "id": "02-b", "slug": "02-b", "number": 2, "title": "B"}),
        encoding="utf-8",
    )
    guide_payload = {
        "id": "aluminio",
        "title": "Alumínio",
        "subject": "metalurgia",
        "type": "teoria",
        "meta": {},
        "cover": {"markdown": f"# Alumínio {marker}\n"},
        "chapters": [
            {"id": "01-intro", "number": 1, "title": "Introdução", "slug": "01-intro"},
            {"id": "02-b", "number": 2, "title": "B", "slug": "02-b"},
        ],
    }
    (guide / "guide.json").write_text(json.dumps(guide_payload), encoding="utf-8")

    index = {
        "generatedAt": marker,
        "subjects": [{"id": "metalurgia", "title": "Metalurgia", "order": 1}],
        "guides": [
            {
                "id": "aluminio",
                "title": "Alumínio",
                "subject": "metalurgia",
                "type": "teoria",
                "chapterCount": 2,
                "updatedAt": marker,
                "cover": image_src,
            }
        ],
    }
    (content / "index.json").write_text(json.dumps(index), encoding="utf-8")
    (content / "search.json").write_text(
        json.dumps([{"id": "aluminio/01-intro", "text": marker}]), encoding="utf-8"
    )

    for number in range(filler_files):
        filler = content / "media" / "filler"
        filler.mkdir(parents=True, exist_ok=True)
        (filler / f"{number:04d}.webp").write_bytes(webp(f"{marker}-{number}".encode()))
    return dist, content


def run_publish(root: Path, dist: Path, content: Path, **kwargs):
    defaults = dict(
        content_root=content,
        web_dist=dist,
        builds_root=root / "builds",
        current=root / "current",
        web_build=False,
    )
    defaults.update(kwargs)
    return publish(**defaults)


def test_publish_stages_verifies_and_swaps(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    report = run_publish(tmp_path, dist, content, stamp="20261021T120000Z")

    build_dir = tmp_path / "builds" / "20261021T120000Z"
    assert report.build_dir == build_dir
    assert report.previous is None
    assert [check.name for check in report.checks] == [
        "spa",
        "bundle",
        "index",
        "chapter",
        "media",
    ]

    # The published tree is a complete copy of both inputs.
    assert (build_dir / "web" / "index.html").is_file()
    assert (build_dir / "web" / "assets" / "index-ABC123.js").is_file()
    assert (build_dir / "content" / "index.json").is_file()
    assert (build_dir / "content" / "media" / "AAA" / "1280.webp").is_file()

    # `current` is a relative symlink, so the whole project can move.
    assert (tmp_path / "current").is_symlink()
    assert os.readlink(tmp_path / "current") == "builds/20261021T120000Z"
    assert (tmp_path / "current").resolve() == build_dir
    assert report.files > 0 and report.bytes > 0

    # A second publish repoints current and reports the previous build.
    dist_b, content_b = make_source(tmp_path / "b", "BBB")
    second = run_publish(
        tmp_path, dist_b, content_b, stamp="20261021T130000Z", content_root=content_b
    )
    assert second.previous == build_dir
    assert (tmp_path / "current").resolve() == tmp_path / "builds" / "20261021T130000Z"
    assert build_dir.is_dir(), "the previous build must survive the swap"


def test_concurrent_reader_never_sees_a_partial_tree(tmp_path: Path) -> None:
    """Every observation resolves to one complete, self-consistent build."""
    dist, content = make_source(tmp_path, "AAA")
    run_publish(tmp_path, dist, content, stamp="20261021T120000Z")

    # A second version with enough files that copying takes real time.
    dist_b, content_b = make_source(tmp_path / "b", "BBB", filler_files=600)
    current = tmp_path / "current"

    stop = threading.Event()
    mismatches: list[str] = []
    observations = 0
    markers: set[str] = set()

    def read_loop() -> None:
        nonlocal observations
        while not stop.is_set():
            try:
                # One resolution per "request", like a handler that resolves the
                # document root once and then serves files from it.
                root = Path(os.path.realpath(current))
                if root.name.startswith(".staging"):
                    mismatches.append(f"current exposed staging dir {root}")
                    continue
                index = json.loads((root / "content" / "index.json").read_text("utf-8"))
                marker = index["generatedAt"]
                chapter = json.loads(
                    (root / "content" / "guides" / "aluminio" / "chapters" / "01-intro.json")
                    .read_text("utf-8")
                )
                media = (root / "content" / "media" / marker / "1280.webp").read_bytes()
            except (OSError, json.JSONDecodeError, KeyError) as exc:
                mismatches.append(f"{type(exc).__name__}: {exc}")
                continue

            observations += 1
            markers.add(marker)
            if marker not in chapter["title"]:
                mismatches.append(f"chapter {chapter['title']!r} != index {marker!r}")
            if not media.startswith(b"RIFF") or media[8:12] != b"WEBP":
                mismatches.append(f"media for {marker!r} is not WebP")
            elif marker.encode() not in media:
                mismatches.append(f"media body does not belong to {marker!r}")

    reader = threading.Thread(target=read_loop, daemon=True)
    reader.start()
    try:
        # Publish B twice; each publish must keep every observation consistent.
        run_publish(
            tmp_path,
            dist_b,
            content_b,
            stamp="20261021T130000Z",
            content_root=content_b,
        )
        run_publish(
            tmp_path,
            dist,
            content,
            stamp="20261021T140000Z",
        )
    finally:
        stop.set()
        reader.join(timeout=5)

    assert observations > 0, "the reader never completed a read"
    assert mismatches == [], mismatches[:5]
    assert markers == {"AAA", "BBB"}, markers
    assert (current).resolve().name == "20261021T140000Z"
    assert list(tmp_path.glob("builds/.staging*")) == []


def test_smoke_failure_leaves_current_and_builds_untouched(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    first = run_publish(tmp_path, dist, content, stamp="20261021T120000Z")

    broken = tmp_path / "broken"
    dist_b, content_b = make_source(broken, "BBB")
    chapter = content_b / "guides" / "aluminio" / "chapters" / "01-intro.json"
    chapter.write_text("{not json", encoding="utf-8")

    with pytest.raises(PublishError) as error:
        run_publish(
            tmp_path,
            dist_b,
            content_b,
            stamp="20261021T130000Z",
            content_root=content_b,
        )
    assert "01-intro.json" in str(error.value)
    assert (tmp_path / "current").resolve() == first.build_dir
    assert not (tmp_path / "builds" / "20261021T130000Z").exists()
    assert list(tmp_path.glob("builds/.staging*")) == []


def test_publish_refuses_content_without_media(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    (content / "media").rename(content / "media-gone")

    with pytest.raises(PublishError, match="media cache"):
        run_publish(tmp_path, dist, content)
    assert not (tmp_path / "current").exists()


def test_smoke_check_names_a_chapter_image_missing_from_the_build(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA", chapter_image="/media/AAA/640.webp")

    with pytest.raises(PublishError, match="640.webp"):
        run_publish(tmp_path, dist, content)


def test_publish_refuses_a_real_directory_at_current(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    (tmp_path / "current").mkdir()

    with pytest.raises(PublishError, match="not a symlink"):
        run_publish(tmp_path, dist, content)
    assert list(tmp_path.glob("builds/.staging*")) == []


def test_keep_prunes_older_builds_but_never_the_live_one(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    for hour in range(1, 5):
        run_publish(tmp_path, dist, content, stamp=f"20261021T1{hour}0000Z", keep=2)

    builds = sorted(path.name for path in (tmp_path / "builds").iterdir() if path.is_dir())
    assert builds == ["20261021T130000Z", "20261021T140000Z"]
    assert (tmp_path / "current").resolve().name == "20261021T140000Z"


def test_restart_failure_reports_that_the_swap_already_happened(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")

    def failing_restart() -> bool:
        raise PublishError("systemctl --user restart estudos.service: unit not found")

    with pytest.raises(PublishError, match="published, but the service restart failed"):
        run_publish(
            tmp_path,
            dist,
            content,
            stamp="20261021T120000Z",
            restart=True,
            restart_runner=failing_restart,
        )
    # The swap is what the operator cares about: it did happen, and the message says so.
    assert (tmp_path / "current").resolve().name == "20261021T120000Z"


def test_web_build_failure_stops_before_creating_a_build(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")

    def failing_build(web_dir: Path) -> None:
        raise PublishError(f"{web_dir}: npm run build exited 1")

    with pytest.raises(PublishError, match="npm run build"):
        publish(
            content_root=content,
            web_dist=dist,
            builds_root=tmp_path / "builds",
            current=tmp_path / "current",
            web_dir=tmp_path / "web",
            build_runner=failing_build,
        )
    assert not (tmp_path / "builds").exists()
    assert (tmp_path / "web" / "dist" / "index.html").is_file(), "dist must be untouched"


def test_cli_publishes_existing_dist(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    dist, content = make_source(tmp_path, "AAA")
    exit_code = publish_module.main(
        [
            "--content-root",
            str(content),
            "--web-dist",
            str(dist),
            "--builds-root",
            str(tmp_path / "builds"),
            "--current",
            str(tmp_path / "current"),
            "--skip-web-build",
            "--keep",
            "1",
        ]
    )
    output = capsys.readouterr().out
    assert exit_code == 0
    assert "published" in output
    assert "check media" in output
    assert (tmp_path / "current").is_symlink()


def test_smoke_check_reads_a_real_staged_tree(tmp_path: Path) -> None:
    dist, content = make_source(tmp_path, "AAA")
    report = run_publish(tmp_path, dist, content, stamp="20261021T120000Z")
    checks = {check.name: check for check in smoke_check(report.build_dir)}
    assert checks["chapter"].path.endswith("01-intro.json")
    assert checks["media"].path == "content/media/AAA/1280.webp"
