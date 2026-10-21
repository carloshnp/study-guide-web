from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pipeline.build import BuildError, build_all, build_guide
from pipeline.catalog import load
from tests.pipeline.helpers import build_example_tree

INDEX_KEYS = {"generatedAt", "subjects", "guides"}
SUBJECT_KEYS = {"id", "title", "order"}
INDEX_GUIDE_KEYS = {
    "id",
    "title",
    "subject",
    "type",
    "chapterCount",
    "updatedAt",
    "cover",
}
GUIDE_KEYS = {"id", "title", "subject", "type", "meta", "cover", "chapters"}
GUIDE_META_KEYS = {"discipline", "professor", "sources"}
CHAPTER_SUMMARY_KEYS = {
    "id",
    "number",
    "title",
    "slug",
    "part",
    "kind",
    "sections",
}
SECTION_KEYS = {"id", "title", "level", "parentId"}
CHAPTER_KEYS = {
    "id",
    "guideId",
    "number",
    "title",
    "slug",
    "kind",
    "part",
    "markdown",
    "sections",
    "images",
}
IMAGE_KEYS = {"src", "srcset", "width", "height", "alt", "original"}


@pytest.fixture
def built(tmp_path: Path) -> tuple[Path, Path]:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    return catalog_path, content_root


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def test_index_json_shape(built: tuple[Path, Path]) -> None:
    _, content_root = built

    index = read_json(content_root / "index.json")

    assert set(index) == INDEX_KEYS
    assert index["generatedAt"].endswith("Z")
    assert set(index["subjects"][0]) == SUBJECT_KEYS
    assert index["subjects"][0] == {"id": "metalurgia", "title": "Metalurgia", "order": 1}
    guide = index["guides"][0]
    assert set(guide) == INDEX_GUIDE_KEYS
    assert guide == {
        "id": "aluminio",
        "title": "Alumínio",
        "subject": "metalurgia",
        "type": "teoria",
        "chapterCount": 2,
        "updatedAt": "2026-10-21T00:00:00Z",
        "cover": "/media/covers/aluminio.webp",
    }
    assert (content_root / "media" / "covers" / "aluminio.webp").is_file()


def test_guide_json_shape_and_cover_markdown(built: tuple[Path, Path]) -> None:
    _, content_root = built

    guide = read_json(content_root / "guides" / "aluminio" / "guide.json")

    assert set(guide) == GUIDE_KEYS
    assert guide["id"] == "aluminio"
    assert guide["type"] == "teoria"
    assert set(guide["meta"]) >= GUIDE_META_KEYS
    assert guide["meta"]["discipline"] is None
    assert guide["meta"]["professor"] is None
    assert guide["meta"]["sources"] == []
    assert set(guide["cover"]) == {"markdown"}
    cover = guide["cover"]["markdown"]
    assert cover.startswith("# Alumínio")
    assert "## Índice" in cover
    assert "1. Capítulo um" in cover
    assert "## 1. O alumínio" not in cover
    assert "Texto do capítulo um" not in cover
    assert len(guide["chapters"]) == 2
    for chapter, number in zip(guide["chapters"], (1, 2)):
        assert set(chapter) == CHAPTER_SUMMARY_KEYS
        assert chapter["number"] == number
        assert chapter["slug"] == chapter["id"]
    assert set(guide["chapters"][0]["sections"][0]) == SECTION_KEYS
    assert guide["chapters"][0]["sections"] == [
        {
            "id": "11-obtencao-e-viabilidade-comercial",
            "title": "1.1 Obtenção e viabilidade comercial",
            "level": 3,
            "parentId": None,
        }
    ]


def test_chapter_json_shape_and_media_manifest(built: tuple[Path, Path]) -> None:
    _, content_root = built
    guide_dir = content_root / "guides" / "aluminio"

    chapter = read_json(guide_dir / "chapters" / "01-o-aluminio-como-metal-de-engenharia.json")

    assert set(chapter) == CHAPTER_KEYS
    assert chapter["id"] == "01-o-aluminio-como-metal-de-engenharia"
    assert chapter["guideId"] == "aluminio"
    assert chapter["number"] == 1
    assert chapter["kind"] == "teoria"
    assert chapter["part"] is None
    assert chapter["markdown"].startswith("## 1. O alumínio como metal de engenharia")
    assert "## 2. Classificação" not in chapter["markdown"]
    assert len(chapter["images"]) == 2
    for image in chapter["images"]:
        assert set(image) == IMAGE_KEYS
        sha = image["src"].split("/")[2]
        assert image["src"] == f"/media/{sha}/1280.webp"
        assert image["srcset"] == (
            f"/media/{sha}/640.webp 640w, /media/{sha}/1280.webp 1280w"
        )
        assert image["original"].startswith(f"/media/{sha}/original.")
        assert image["width"] == 1280
        for url in (image["src"], image["original"]):
            assert (content_root / url.lstrip("/")).is_file()
        for candidate in image["srcset"].split(", "):
            path = candidate.rsplit(" ", 1)[0]
            assert (content_root / path.lstrip("/")).is_file()
    assert "/media/" in chapter["markdown"]
    assert "assets/local.png" not in chapter["markdown"]
    assert "../shared/outside.png" not in chapter["markdown"]
    assert chapter["images"][0]["alt"] == "Figura local"
    assert chapter["images"][1]["alt"] == "Figura fora da pasta"


def test_build_is_idempotent_and_prunes_stale_chapters(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    chapters_dir = content_root / "guides" / "aluminio" / "chapters"
    (chapters_dir / "99-velho.json").write_text("{}", encoding="utf-8")

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    assert sorted(p.name for p in chapters_dir.iterdir()) == [
        "01-o-aluminio-como-metal-de-engenharia.json",
        "02-classificacao-das-ligas-de-aluminio.json",
    ]


def test_chapter_count_must_match_the_catalog(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path, expected_chapters=3)
    catalog = load(catalog_path)

    with pytest.raises(BuildError) as excinfo:
        build_guide(
            catalog.guide("aluminio"),
            catalog,
            data_root=data_root,
            content_root=content_root,
        )

    message = str(excinfo.value)
    assert "aluminio" in message
    assert "expected_chapters: 3" in message
    assert "measured: 2" in message


def test_missing_ingested_guide_fails_with_the_path(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    (data_root / "guides" / "metalurgia" / "aluminio" / "guide.md").unlink()
    catalog = load(catalog_path)

    with pytest.raises(BuildError) as excinfo:
        build_guide(
            catalog.guide("aluminio"),
            catalog,
            data_root=data_root,
            content_root=content_root,
        )

    assert "guide.md" in str(excinfo.value)


def test_build_reports_the_chapter_count(built: tuple[Path, Path]) -> None:
    catalog_path, content_root = built
    report = build_all(
        catalog_path=catalog_path,
        data_root=content_root.parent / "data",
        content_root=content_root,
    )

    assert [(g.guide_id, g.chapters) for g in report.guides] == [("aluminio", 2)]
    assert report.content_root == content_root
