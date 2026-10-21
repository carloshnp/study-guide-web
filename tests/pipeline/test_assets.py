from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
from PIL import Image as PILImage

from pipeline.assets import AssetError, ImageRef, cover_image, rewrite_links


def make_png(path: Path, size: tuple[int, int], color: tuple[int, int, int] = (180, 40, 40)) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    PILImage.new("RGB", size, color).save(path, format="PNG")
    return path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <rect x="0" y="0" width="400" height="200" fill="#1d4ed8"/>
</svg>
"""


@pytest.fixture
def guide_dir(tmp_path: Path) -> Path:
    """A copied guide tree shaped like data/guides/<subject>/<id>/."""
    root = tmp_path / "data" / "guides" / "metalurgia" / "aluminio"
    make_png(root / "assets" / "local.png", (1600, 900))
    make_png(root / "assets" / "__up__" / "shared" / "outside.png", (900, 600))
    (root / "assets" / "diagrams").mkdir(parents=True, exist_ok=True)
    (root / "assets" / "diagrams" / "fig.svg").write_text(SVG, encoding="utf-8")
    return root


def assets_map(guide_dir: Path) -> dict[str, Path]:
    return {
        "assets/local.png": guide_dir / "assets" / "local.png",
        "../shared/outside.png": guide_dir / "assets" / "__up__" / "shared" / "outside.png",
        "assets/diagrams/fig.svg": guide_dir / "assets" / "diagrams" / "fig.svg",
    }


def test_image_links_are_rewritten_to_the_media_cache(tmp_path: Path, guide_dir: Path) -> None:
    markdown = (
        "Texto.\n\n"
        "![Figura local](assets/local.png)\n\n"
        "![Figura fora da pasta](../shared/outside.png)\n"
    )
    media_root = tmp_path / "content" / "media"

    rewritten, images = rewrite_links(
        markdown,
        source_file=guide_dir / "guide.md",
        media_root=media_root,
        assets=assets_map(guide_dir),
    )

    local_sha = sha256(guide_dir / "assets" / "local.png")
    outside_sha = sha256(guide_dir / "assets" / "__up__" / "shared" / "outside.png")
    assert f"![Figura local](/media/{local_sha}/1280.webp)" in rewritten
    assert f"![Figura fora da pasta](/media/{outside_sha}/1280.webp)" in rewritten
    assert "assets/local.png" not in rewritten
    assert "../shared/outside.png" not in rewritten
    assert [image.src for image in images] == [
        f"/media/{local_sha}/1280.webp",
        f"/media/{outside_sha}/1280.webp",
    ]


def test_each_image_gets_640_1280_and_an_original_fallback(
    tmp_path: Path, guide_dir: Path
) -> None:
    media_root = tmp_path / "content" / "media"

    _, images = rewrite_links(
        "![Local](assets/local.png)\n",
        source_file=guide_dir / "guide.md",
        media_root=media_root,
        assets=assets_map(guide_dir),
    )

    sha = sha256(guide_dir / "assets" / "local.png")
    directory = media_root / sha
    assert sorted(p.name for p in directory.iterdir()) == [
        "1280.webp",
        "640.webp",
        "original.png",
    ]
    with PILImage.open(directory / "640.webp") as small:
        assert small.size == (640, 360)
        assert small.format == "WEBP"
    with PILImage.open(directory / "1280.webp") as large:
        assert large.size == (1280, 720)
        assert large.format == "WEBP"
    assert (directory / "original.png").read_bytes() == (
        guide_dir / "assets" / "local.png"
    ).read_bytes()
    assert images[0] == ImageRef(
        src=f"/media/{sha}/1280.webp",
        srcset=f"/media/{sha}/640.webp 640w, /media/{sha}/1280.webp 1280w",
        width=1280,
        height=720,
        alt="Local",
        original=f"/media/{sha}/original.png",
    )


def test_svg_is_rasterised_before_webp(tmp_path: Path, guide_dir: Path) -> None:
    media_root = tmp_path / "content" / "media"

    _, images = rewrite_links(
        "![Diagrama](assets/diagrams/fig.svg)\n",
        source_file=guide_dir / "guide.md",
        media_root=media_root,
        assets=assets_map(guide_dir),
    )

    image = images[0]
    sha = sha256(guide_dir / "assets" / "diagrams" / "fig.svg")
    assert image.src == f"/media/{sha}/1280.webp"
    assert (image.width, image.height) == (1280, 640)
    assert (media_root / sha / "original.svg").is_file()
    with PILImage.open(media_root / sha / "1280.webp") as rendered:
        assert rendered.size == (1280, 640)


def test_second_run_hits_the_cache_instead_of_re_encoding(
    tmp_path: Path, guide_dir: Path
) -> None:
    media_root = tmp_path / "content" / "media"
    kwargs = dict(
        source_file=guide_dir / "guide.md",
        media_root=media_root,
        assets=assets_map(guide_dir),
    )
    _, first = rewrite_links("![Local](assets/local.png)\n", **kwargs)
    sha = sha256(guide_dir / "assets" / "local.png")
    stamps = {p.name: p.stat().st_mtime_ns for p in (media_root / sha).iterdir()}

    _, second = rewrite_links("![Local](assets/local.png)\n", **kwargs)

    assert first == second
    assert {p.name: p.stat().st_mtime_ns for p in (media_root / sha).iterdir()} == stamps


def test_missing_target_fails_with_the_offending_link(
    tmp_path: Path, guide_dir: Path
) -> None:
    media_root = tmp_path / "content" / "media"

    with pytest.raises(AssetError) as excinfo:
        rewrite_links(
            "![Faltando](assets/nao-existe.png)\n",
            source_file=guide_dir / "guide.md",
            media_root=media_root,
            assets=assets_map(guide_dir),
        )

    message = str(excinfo.value)
    assert "assets/nao-existe.png" in message
    assert "guide.md" in message


def test_image_syntax_inside_a_fence_is_left_alone(tmp_path: Path, guide_dir: Path) -> None:
    markdown = "```markdown\n![Dentro](assets/local.png)\n```\n\n![Fora](assets/local.png)\n"
    media_root = tmp_path / "content" / "media"

    rewritten, images = rewrite_links(
        markdown,
        source_file=guide_dir / "guide.md",
        media_root=media_root,
        assets=assets_map(guide_dir),
    )

    assert "![Dentro](assets/local.png)" in rewritten
    assert len(images) == 1
    assert rewritten.count("![Fora](") == 1


def test_plain_links_and_prose_are_untouched(tmp_path: Path, guide_dir: Path) -> None:
    markdown = "Veja [a seção](#11-detalhe) e a tabela em assets/local.png no texto.\n"

    rewritten, images = rewrite_links(
        markdown,
        source_file=guide_dir / "guide.md",
        media_root=tmp_path / "media",
        assets=assets_map(guide_dir),
    )

    assert rewritten == markdown
    assert images == []


def test_cover_is_a_sixteen_by_nine_webp(tmp_path: Path, guide_dir: Path) -> None:
    source = guide_dir / "assets" / "local.png"
    dest = tmp_path / "content" / "media" / "covers" / "aluminio.webp"

    cover_image(source, dest)

    assert dest.is_file()
    with PILImage.open(dest) as cover:
        assert cover.format == "WEBP"
        assert cover.size == (1280, 720)


def test_cover_accepts_the_svg_first_figure(tmp_path: Path, guide_dir: Path) -> None:
    dest = tmp_path / "content" / "media" / "covers" / "magnesio.webp"

    cover_image(guide_dir / "assets" / "diagrams" / "fig.svg", dest)

    with PILImage.open(dest) as cover:
        assert cover.size == (1280, 720)
