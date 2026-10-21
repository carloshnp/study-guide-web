from __future__ import annotations

from pathlib import Path

import pytest

from tests.pipeline.helpers import FIXTURES, GUIDE_MARKDOWN, REPO_ROOT


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES


@pytest.fixture
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture
def source_tree(tmp_path: Path) -> Path:
    """A source folder shaped like the real ones, with one asset outside it."""
    root = tmp_path / "src"
    guide_dir = root / "outputs" / "metfis_2_aluminio"
    (guide_dir / "assets").mkdir(parents=True)
    (root / "outputs" / "shared").mkdir(parents=True)
    (guide_dir / "assets" / "local.png").write_bytes(b"\x89PNG\r\n\x1a\nlocal")
    (root / "outputs" / "shared" / "outside.png").write_bytes(b"\x89PNG\r\n\x1a\noutside")
    source = guide_dir / "aluminio-final.md"
    source.write_text(GUIDE_MARKDOWN, encoding="utf-8")
    return source


@pytest.fixture
def data_root(tmp_path: Path) -> Path:
    return tmp_path / "data"
