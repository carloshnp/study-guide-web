from __future__ import annotations

import json
from pathlib import Path

from pipeline.build import build_all
from pipeline.search import build_documents, strip_markdown
from tests.pipeline.helpers import build_example_tree

DOC_KEYS = {"id", "guideId", "guideTitle", "chapterId", "title", "headings", "text"}


def test_one_document_per_chapter(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)

    documents = json.loads((content_root / "search.json").read_text(encoding="utf-8"))

    assert len(documents) == 2
    assert set(documents[0]) == DOC_KEYS
    first = documents[0]
    assert first["id"] == "aluminio/01-o-aluminio-como-metal-de-engenharia"
    assert first["guideId"] == "aluminio"
    assert first["guideTitle"] == "Alumínio"
    assert first["chapterId"] == "01-o-aluminio-como-metal-de-engenharia"
    assert first["title"] == "O alumínio como metal de engenharia"
    assert first["headings"] == [
        "O alumínio como metal de engenharia",
        "1.1 Obtenção e viabilidade comercial",
    ]
    assert "Texto do capítulo um" in first["text"]
    assert "Texto do capítulo dois" not in first["text"]
    assert documents[1]["id"] == "aluminio/02-classificacao-das-ligas-de-aluminio"


def test_markdown_is_stripped_from_the_search_text(tmp_path: Path) -> None:
    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    build_all(catalog_path=catalog_path, data_root=data_root, content_root=content_root)
    documents = json.loads((content_root / "search.json").read_text(encoding="utf-8"))

    text = documents[0]["text"]
    for marker in ("![", "](", "/media/", "##", "**", "```"):
        assert marker not in text
    assert "$" not in text


def test_strip_markdown_keeps_prose_accents_and_math_content() -> None:
    markdown = (
        "## 1. Magnésio\n\n"
        "![Figura](../x/fig.png)\n\n"
        "Texto com **ênfase**, `código` e $\\gamma$ no meio.\n\n"
        "```python\nprint('nao deve entrar')\n```\n\n"
        "Veja [a fonte](https://exemplo.org) agora.\n"
    )

    text = strip_markdown(markdown)

    assert "Magnésio" in text
    assert "ênfase" in text
    assert "código" in text
    assert "\\gamma" in text
    assert "a fonte" in text
    assert "nao deve entrar" not in text
    assert "https://exemplo.org" not in text
    assert "$" not in text
    assert "  " not in text


def test_build_documents_is_pure_and_ordered(tmp_path: Path) -> None:
    from pipeline.catalog import load
    from pipeline.split import split_document

    catalog_path, data_root, content_root = build_example_tree(tmp_path)
    catalog = load(catalog_path)
    entry = catalog.guide("aluminio")
    markdown = (data_root / "guides" / "metalurgia" / "aluminio" / "guide.md").read_text(
        encoding="utf-8"
    )
    document = split_document(markdown, entry.split)

    documents = build_documents(entry, document.chapters)

    assert [doc["chapterId"] for doc in documents] == [c.id for c in document.chapters]
