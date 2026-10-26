"""The ``section-images.json`` sidecar: pinned pictures per section."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pipeline.build import BuildError, build_all
from pipeline.check_links import check_content
from tests.pipeline.helpers import build_example_tree, write_png

CHAPTER = "01-o-aluminio-como-metal-de-engenharia"
SECTION = "11-obtencao-e-viabilidade-comercial"
IMAGE_KEYS = {"src", "srcset", "width", "height", "alt", "original"}


def guide_dir(data_root: Path) -> Path:
    return data_root / "guides" / "metalurgia" / "aluminio"


def write_sidecar(data_root: Path, chapters: dict[str, Any]) -> None:
    (guide_dir(data_root) / "section-images.json").write_text(
        json.dumps({"schemaVersion": 1, "chapters": chapters}), encoding="utf-8"
    )


def chapter_json(content_root: Path, slug: str = CHAPTER) -> dict[str, Any]:
    path = content_root / "guides" / "aluminio" / "chapters" / f"{slug}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_section_images_are_emitted_in_order_with_a_1920_variant(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    write_png(guide_dir(data_root) / "assets" / "secoes" / "a.png", (2560, 1440))
    write_png(guide_dir(data_root) / "assets" / "secoes" / "b.png", (2560, 1440))
    write_sidecar(
        data_root,
        {
            CHAPTER: {
                SECTION: [
                    {"file": "assets/secoes/a.png", "alt": "Primeira", "plan": "ch01-s01"},
                    {"file": "assets/secoes/b.png", "alt": "Segunda"},
                ]
            }
        },
    )

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    pinned = chapter_json(content_root)["sectionImages"]
    assert list(pinned) == [SECTION]
    first, second = pinned[SECTION]
    assert [first["alt"], second["alt"]] == ["Primeira", "Segunda"]
    for image in (first, second):
        assert set(image) == IMAGE_KEYS
        sha = image["src"].split("/")[2]
        assert image["src"] == f"/media/{sha}/1280.webp"
        assert image["srcset"] == (
            f"/media/{sha}/640.webp 640w, /media/{sha}/1280.webp 1280w, "
            f"/media/{sha}/1920.webp 1920w"
        )
        assert (image["width"], image["height"]) == (1280, 720)
        assert (content_root / "media" / sha / "1920.webp").is_file()
    assert check_content(content_root) == []


def test_small_source_does_not_get_an_upscaled_1920_variant(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    write_png(guide_dir(data_root) / "assets" / "secoes" / "a.png", (1280, 720))
    write_sidecar(
        data_root,
        {CHAPTER: {SECTION: [{"file": "assets/secoes/a.png", "alt": "Pequena"}]}},
    )

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    image = chapter_json(content_root)["sectionImages"][SECTION][0]
    assert "1920w" not in image["srcset"]


@pytest.mark.parametrize(
    ("chapters", "needle"),
    [
        ({"99-nao-existe": {SECTION: [{"file": "assets/local.png", "alt": "x"}]}}, "unknown chapter"),
        ({CHAPTER: {"secao-fantasma": [{"file": "assets/local.png", "alt": "x"}]}}, "unknown section id"),
        ({CHAPTER: {SECTION: [{"file": "assets/nao-existe.png", "alt": "x"}]}}, "not found"),
        ({CHAPTER: {SECTION: [{"file": "../../fora.png", "alt": "x"}]}}, "leaves the guide folder"),
        ({CHAPTER: {SECTION: []}}, "non-empty list"),
        ({CHAPTER: {SECTION: [{"file": "assets/local.png", "alt": ""}]}}, '"alt"'),
    ],
)
def test_a_bad_sidecar_fails_the_build_naming_the_problem(
    tmp_path: Path, chapters: dict[str, Any], needle: str
) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    write_sidecar(data_root, chapters)

    with pytest.raises(BuildError) as excinfo:
        build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    message = str(excinfo.value)
    assert needle in message
    assert "section-images.json" in message


def test_sidecar_with_the_wrong_schema_version_is_rejected(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    (guide_dir(data_root) / "section-images.json").write_text(
        json.dumps({"schemaVersion": 2, "chapters": {}}), encoding="utf-8"
    )

    with pytest.raises(BuildError, match="schemaVersion"):
        build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
