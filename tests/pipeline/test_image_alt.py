from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image as PILImage

from pipeline.assets import rewrite_links
from pipeline.ingest import collect_asset_links


def test_ingest_collects_image_links_whose_alt_has_brackets() -> None:
    # "[0,1]" inside the alt text used to end the match early, so the image was
    # never copied and the build left the authored relative path in the page.
    markdown = (
        "![Retângulos sob y = x em [0,1] com n = 4](assets/riemann.png)\n\n"
        "![Comparação simples](assets/gauss.png)\n"
    )

    assert collect_asset_links(markdown) == ["assets/riemann.png", "assets/gauss.png"]


def test_build_rewrites_image_whose_alt_has_brackets(tmp_path: Path) -> None:
    guide_dir = tmp_path / "guide"
    image = guide_dir / "assets" / "riemann.png"
    image.parent.mkdir(parents=True)
    PILImage.new("RGB", (40, 20), (10, 90, 160)).save(image, format="PNG")
    sha = hashlib.sha256(image.read_bytes()).hexdigest()

    rewritten, images = rewrite_links(
        "![Retângulos em [0,1] com n = 4](assets/riemann.png)\n",
        source_file=guide_dir / "guide.md",
        media_root=tmp_path / "content" / "media",
        assets={"assets/riemann.png": image},
    )

    assert rewritten == f"![Retângulos em [0,1] com n = 4](/media/{sha}/1280.webp)\n"
    assert len(images) == 1
