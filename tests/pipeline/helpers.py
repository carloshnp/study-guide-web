"""Shared helpers for the pipeline tests."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image as PILImage

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]

# Mirrors the shape of the real guides: an H1 title, an H2 front matter block,
# two H2 chapters, one local asset and one asset outside the guide folder.
GUIDE_MARKDOWN = """# Alumínio

## Índice

1. Capítulo um
2. Capítulo dois

## 1. O alumínio como metal de engenharia

Texto do capítulo um.

![Figura local](assets/local.png)

![Figura fora da pasta](../shared/outside.png)

### 1.1 Obtenção e viabilidade comercial

Texto da seção.

## 2. Classificação das ligas de alumínio

Texto do capítulo dois.
"""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_png(path: Path, size: tuple[int, int] = (1600, 900)) -> Path:
    """Write a real PNG, so Pillow can decode it in the media pipeline."""
    path.parent.mkdir(parents=True, exist_ok=True)
    PILImage.new("RGB", size, (30, 78, 216)).save(path, format="PNG")
    return path


def build_example_tree(
    root: Path, *, expected_chapters: int = 2, guide_markdown: str = GUIDE_MARKDOWN
) -> tuple[Path, Path, Path]:
    """Create a catalog, an ingested guide tree and a content dir under `root`.

    Returns ``(catalog_path, data_root, content_root)``.
    """
    data_root = root / "data"
    guide_dir = data_root / "guides" / "metalurgia" / "aluminio"
    guide_dir.mkdir(parents=True)
    (guide_dir / "guide.md").write_text(guide_markdown, encoding="utf-8")
    local = write_png(guide_dir / "assets" / "local.png", (1600, 900))
    outside = write_png(guide_dir / "assets" / "__up__" / "shared" / "outside.png", (900, 600))
    meta = {
        "schemaVersion": 1,
        "guideId": "aluminio",
        "slug": "aluminio",
        "title": "Alumínio",
        "subject": "metalurgia",
        "type": "teoria",
        "split": 2,
        "sourcePath": "/srv/guias/aluminio-final.md",
        "sourceMtime": "2026-09-21T21:42:38-03:00",
        "sha256": "0" * 64,
        "bytes": len(guide_markdown),
        "chapters": expected_chapters,
        "ingestedAt": "2026-10-21T05:22:57Z",
        "assets": [
            {
                "link": "assets/local.png",
                "path": "assets/local.png",
                "sha256": sha256_file(local),
                "bytes": local.stat().st_size,
            },
            {
                "link": "../shared/outside.png",
                "path": "assets/__up__/shared/outside.png",
                "sha256": sha256_file(outside),
                "bytes": outside.stat().st_size,
            },
        ],
    }
    (guide_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    catalog_path = root / "catalog.yaml"
    catalog_path.write_text(
        "version: 1\n"
        "subjects:\n"
        "  - {id: metalurgia, title: Metalurgia, order: 1}\n"
        "guides:\n"
        "  - id: aluminio\n"
        "    title: Alumínio\n"
        "    subject: metalurgia\n"
        "    type: teoria\n"
        "    split: 2\n"
        f"    expected_chapters: {expected_chapters}\n"
        "    order: 1\n"
        "    published: true\n"
        "    updated: 2026-10-21\n",
        encoding="utf-8",
    )
    content_root = root / "content"
    return catalog_path, data_root, content_root


def git_log(data_root: Path) -> list[str]:
    result = subprocess.run(
        ["git", "-C", str(data_root), "log", "--format=%s"],
        capture_output=True,
        text=True,
        check=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]
