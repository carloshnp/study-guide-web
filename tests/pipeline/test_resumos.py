"""Contract tests for the resumo pages built next to each guide's chapters.

A resumo is an authored Markdown summary of one chapter, kept in
``data/guides/<subject>/<slug>/resumos/<chapterId>.md`` with its figures in a
``imagens/`` subfolder. The build publishes it as
``content/guides/<guideId>/resumos/<chapterId>.json`` and advertises the ids in
``guide.json``'s ``resumos`` list.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pipeline.build import BuildError, build_all
from tests.pipeline.helpers import build_example_tree, write_png

RESUMO_KEYS = {"guideId", "chapterId", "markdown", "images"}
IMAGE_KEYS = {"src", "srcset", "width", "height", "alt", "original"}
CHAPTER_ONE = "01-o-aluminio-como-metal-de-engenharia"
CHAPTER_TWO = "02-classificacao-das-ligas-de-aluminio"

RESUMO_MARKDOWN = """# Resumo: o alumínio como metal

Versão condensada do capítulo.

![Figura do resumo](imagens/figura.png)
"""


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def resumos_dir(data_root: Path) -> Path:
    return data_root / "guides" / "metalurgia" / "aluminio" / "resumos"


def write_resumo(
    data_root: Path,
    chapter_id: str,
    markdown: str = RESUMO_MARKDOWN,
    *,
    image: bool = True,
) -> Path:
    """Author a resumo file (and its figure) next to the ingested guide."""
    directory = resumos_dir(data_root)
    directory.mkdir(parents=True, exist_ok=True)
    if image:
        write_png(directory / "imagens" / "figura.png", (1600, 900))
    path = directory / f"{chapter_id}.md"
    path.write_text(markdown, encoding="utf-8")
    return path


def test_resumo_json_shape_and_media_manifest(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    write_resumo(data_root, CHAPTER_ONE)

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    path = content_root / "guides" / "aluminio" / "resumos" / f"{CHAPTER_ONE}.json"
    assert path.is_file()
    payload = read_json(path)
    assert set(payload) == RESUMO_KEYS
    assert payload["guideId"] == "aluminio"
    assert payload["chapterId"] == CHAPTER_ONE
    # The resumo text survives, but its figure link is rewritten to the cache.
    assert "Versão condensada do capítulo." in payload["markdown"]
    assert "imagens/figura.png" not in payload["markdown"]
    assert "/media/" in payload["markdown"]
    assert len(payload["images"]) == 1
    image = payload["images"][0]
    assert set(image) == IMAGE_KEYS
    sha = image["src"].split("/")[2]
    assert image["src"] == f"/media/{sha}/1280.webp"
    assert image["srcset"] == (
        f"/media/{sha}/640.webp 640w, /media/{sha}/1280.webp 1280w"
    )
    assert image["original"] == f"/media/{sha}/original.png"
    assert image["width"] == 1280
    assert image["height"] == 720
    assert image["alt"] == "Figura do resumo"
    for url in (image["src"], image["original"]):
        assert (content_root / url.lstrip("/")).is_file()
    for candidate in image["srcset"].split(", "):
        variant = candidate.rsplit(" ", 1)[0]
        assert (content_root / variant.lstrip("/")).is_file()


def test_guide_json_lists_resumos_sorted(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    # Authored out of order on purpose: the emitted list is sorted by chapter id.
    write_resumo(data_root, CHAPTER_TWO)
    write_resumo(data_root, CHAPTER_ONE)

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    guide = read_json(content_root / "guides" / "aluminio" / "guide.json")
    assert "resumos" in guide
    assert guide["resumos"] == [CHAPTER_ONE, CHAPTER_TWO]
    # The standard chapter payload is untouched by the resumo pipeline.
    chapter = read_json(
        content_root / "guides" / "aluminio" / "chapters" / f"{CHAPTER_ONE}.json"
    )
    assert "resumos" not in chapter
    assert chapter["markdown"].startswith("## 1. O alumínio")


def test_guide_without_resumos_lists_an_empty_list(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)

    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    guide = read_json(content_root / "guides" / "aluminio" / "guide.json")
    assert guide["resumos"] == []


def test_resumo_stem_must_match_a_chapter_id(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    stray = write_resumo(data_root, "99-capitulo-inexistente")

    with pytest.raises(BuildError) as excinfo:
        build_all(
            catalog_path=catalog_path, data_root=data_root, content_root=content_root
        )

    message = str(excinfo.value)
    assert "99-capitulo-inexistente" in message
    assert "does not match" in message
    assert "aluminio" in message
    assert not (
        content_root / "guides" / "aluminio" / "resumos" / "99-capitulo-inexistente.json"
    ).exists()
    # The failing file is named so the author knows what to rename or remove.
    assert stray.name in message


def test_rebuild_prunes_stale_resumo_json(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    write_resumo(data_root, CHAPTER_ONE)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    resumo_json = content_root / "guides" / "aluminio" / "resumos" / f"{CHAPTER_ONE}.json"
    assert resumo_json.is_file()
    stray = resumo_json.parent / "99-velho.json"
    stray.write_text("{}", encoding="utf-8")

    # Removing the authored resumo must remove its published JSON, and stray
    # JSON files in the folder are pruned like stale chapter files.
    (resumos_dir(data_root) / f"{CHAPTER_ONE}.md").unlink()
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    assert not resumo_json.exists()
    assert not stray.exists()
    guide = read_json(content_root / "guides" / "aluminio" / "guide.json")
    assert guide["resumos"] == []
