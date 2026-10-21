from __future__ import annotations

import json
from pathlib import Path

from pipeline.build import build_all
from pipeline.check_links import LinkProblem, check_content, main
from tests.pipeline.helpers import build_example_tree


def test_clean_content_has_no_broken_links(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    assert check_content(content_root) == []
    assert main(["--content", str(content_root)]) == 0


def test_a_deleted_media_file_is_reported(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    chapter_path = (
        content_root / "guides" / "aluminio" / "chapters" / "01-o-aluminio-como-metal-de-engenharia.json"
    )
    chapter = json.loads(chapter_path.read_text(encoding="utf-8"))
    target = content_root / chapter["images"][0]["src"].lstrip("/")
    target.unlink()

    problems = check_content(content_root)

    assert problems, "a missing webp must fail the link check"
    assert any(target.name in p.link for p in problems)
    assert any(p.file == chapter_path for p in problems)
    assert main(["--content", str(content_root)]) == 1


def test_a_missing_cover_is_reported(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    (content_root / "media" / "covers" / "aluminio.webp").unlink()

    problems = check_content(content_root)

    assert [p.link for p in problems] == ["/media/covers/aluminio.webp"]
    assert problems[0].file == content_root / "index.json"


def test_a_link_in_cover_markdown_is_checked(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    guide_path = content_root / "guides" / "aluminio" / "guide.json"
    guide = json.loads(guide_path.read_text(encoding="utf-8"))
    guide["cover"]["markdown"] += "\n![Quebrada](/media/nao-existe/1280.webp)\n"
    guide_path.write_text(json.dumps(guide), encoding="utf-8")

    problems = check_content(content_root)

    assert [p.link for p in problems] == ["/media/nao-existe/1280.webp"]
    assert isinstance(problems[0], LinkProblem)
    assert "guide.json" in str(problems[0].file)


def test_manifest_entries_are_checked_even_when_the_markdown_is_clean(
    tmp_path: Path,
) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    chapter_path = (
        content_root / "guides" / "aluminio" / "chapters" / "01-o-aluminio-como-metal-de-engenharia.json"
    )
    chapter = json.loads(chapter_path.read_text(encoding="utf-8"))
    original = content_root / chapter["images"][0]["original"].lstrip("/")
    original.unlink()

    problems = check_content(content_root)

    assert [p.link for p in problems] == [chapter["images"][0]["original"]]
    assert problems[0].file == chapter_path


def test_reports_do_not_crash_on_empty_content(tmp_path: Path) -> None:
    empty = tmp_path / "content"
    empty.mkdir()

    assert check_content(empty) == []
    assert main(["--content", str(empty)]) == 1
