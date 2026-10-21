"""Image link rewriting and the media cache.

Every image of a chapter is rewritten from a repo-relative path to a
content-addressed URL, ``/media/<sha256>/<width>.webp``, and the build writes
two webp variants plus a copy of the original file next to them, so the reader
can offer a lightbox link to the untouched source.

The cache is keyed by the sha256 of the source file: a file that is already in
``media_root`` is never encoded again, which is what keeps a rebuild of the
whole corpus under a couple of seconds.
"""

from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from PIL import Image as PILImage

WIDTHS: tuple[int, ...] = (640, 1280)
DEFAULT_WIDTH = WIDTHS[-1]
WEBP_QUALITY = 82
COVER_SIZE: tuple[int, int] = (1280, 720)
SERVED_PREFIX = "/media"

IMAGE_RE = re.compile(
    r"!\[(?P<alt>[^\]]*)\]\(\s*(?P<link><[^>]+>|[^)\s]+)(?P<title>\s+\"[^\"]*\")?\s*\)"
)
FENCE_RE = re.compile(r"^(?: {0,3})(`{3,}|~{3,})")


class AssetError(RuntimeError):
    """Raised when an image link cannot be resolved to an ingested file."""


@dataclass(frozen=True)
class ImageRef:
    """One image of a chapter, as emitted in the chapter manifest."""

    src: str
    srcset: str
    width: int
    height: int
    alt: str
    original: str

    def as_json(self) -> dict[str, object]:
        return {
            "src": self.src,
            "srcset": self.srcset,
            "width": self.width,
            "height": self.height,
            "alt": self.alt,
            "original": self.original,
        }


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _rasterise_svg(source: Path, target_width: int) -> PILImage.Image:
    """Render an SVG at `target_width` pixels with rsvg-convert."""
    binary = shutil.which("rsvg-convert")
    if binary is None:
        raise AssetError(
            f"{source}: cannot rasterise SVG, rsvg-convert is not installed"
        )
    with tempfile.TemporaryDirectory(prefix="estudos-svg-") as tmp:
        destination = Path(tmp) / "render.png"
        result = subprocess.run(
            [binary, "--width", str(target_width), "--format", "png",
             "--output", str(destination), str(source)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0 or not destination.is_file():
            raise AssetError(
                f"{source}: rsvg-convert failed ({result.returncode}): "
                f"{result.stderr.strip() or 'no output'}"
            )
        with PILImage.open(destination) as rendered:
            return rendered.convert("RGBA")


def load_image(source: Path) -> PILImage.Image:
    """Decode a PNG/JPEG/WebP, or rasterise an SVG, into a Pillow image."""
    try:
        with PILImage.open(source) as image:
            return image.convert("RGBA")
    except Exception:
        if source.suffix.lower() == ".svg":
            return _rasterise_svg(source, DEFAULT_WIDTH)
        raise AssetError(f"{source}: not a decodable image")


def _resize(image: PILImage.Image, width: int) -> PILImage.Image:
    if image.width == width:
        return image
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), PILImage.Resampling.LANCZOS)


def _cache_is_complete(directory: Path, original: Path, widths: tuple[int, ...]) -> bool:
    if not original.is_file() or original.stat().st_size == 0:
        return False
    for width in widths:
        variant = directory / f"{width}.webp"
        if not variant.is_file() or variant.stat().st_size == 0:
            return False
    return True


def media_variants(source: Path, media_root: Path) -> tuple[str, list[int], tuple[int, int]]:
    """Ensure ``media_root/<sha>/`` holds the webp variants and the original.

    Returns the sha256 cache key, the widths written and the pixel size of the
    widest variant. A complete cache entry is left untouched.
    """
    if not source.is_file():
        raise AssetError(f"{source}: image file not found")
    sha = sha256_file(source)
    directory = media_root / sha
    original = directory / f"original{source.suffix.lower()}"
    if not _cache_is_complete(directory, original, WIDTHS):
        directory.mkdir(parents=True, exist_ok=True)
        image = load_image(source)
        for width in WIDTHS:
            variant = _resize(image, width)
            variant.save(
                directory / f"{width}.webp",
                format="WEBP",
                quality=WEBP_QUALITY,
                method=4,
            )
        if not original.is_file() or original.stat().st_size == 0:
            shutil.copyfile(source, original)
    with PILImage.open(directory / f"{DEFAULT_WIDTH}.webp") as widest:
        size = widest.size
    return sha, list(WIDTHS), size


def _resolve(link: str, source_file: Path, assets: Mapping[str, Path] | None) -> Path:
    decoded = link
    if decoded.startswith("<") and decoded.endswith(">"):
        decoded = decoded[1:-1]
    decoded = decoded.replace("%20", " ")
    if assets is not None and link in assets:
        return assets[link]
    if assets is not None and decoded in assets:
        return assets[decoded]
    candidate = (source_file.parent / decoded).resolve()
    if candidate.is_file():
        return candidate
    known = ", ".join(sorted(assets)[:3]) if assets else "no manifest"
    raise AssetError(
        f"{source_file}: image link {link!r} does not resolve to a copied asset "
        f"({known}{'...' if assets and len(assets) > 3 else ''})"
    )


def rewrite_links(
    markdown: str,
    source_file: Path,
    media_root: Path,
    *,
    assets: Mapping[str, Path] | None = None,
) -> tuple[str, list[ImageRef]]:
    """Rewrite every image link to the media cache and describe the images.

    ``assets`` maps the link as authored in the guide to the copied file inside
    ``data/`` (``meta.json``'s ``assets[].link``/``path``). Links inside fenced
    code are left untouched: they are samples, not figures.
    """
    images: list[ImageRef] = []
    by_link: dict[str, ImageRef] = {}
    output: list[str] = []
    fence: str | None = None

    for line in markdown.splitlines(keepends=True):
        marker = FENCE_RE.match(line)
        if fence is None and marker is not None:
            fence = marker.group(1)
            output.append(line)
            continue
        if fence is not None:
            if (
                marker is not None
                and marker.group(1)[0] == fence[0]
                and len(marker.group(1)) >= len(fence)
            ):
                fence = None
            output.append(line)
            continue

        def replace(match: re.Match[str]) -> str:
            link = match.group("link")
            image = by_link.get(link)
            if image is None:
                source = _resolve(link, source_file, assets)
                sha, widths, size = media_variants(source, media_root)
                image = ImageRef(
                    src=f"{SERVED_PREFIX}/{sha}/{DEFAULT_WIDTH}.webp",
                    srcset=", ".join(
                        f"{SERVED_PREFIX}/{sha}/{width}.webp {width}w" for width in widths
                    ),
                    width=size[0],
                    height=size[1],
                    alt=match.group("alt"),
                    original=f"{SERVED_PREFIX}/{sha}/original{source.suffix.lower()}",
                )
                by_link[link] = image
                images.append(image)
            title = match.group("title") or ""
            return f"![{match.group('alt')}]({image.src}{title})"

        output.append(IMAGE_RE.sub(replace, line))
    return "".join(output), images


def cover_image(source: Path, destination: Path) -> Path:
    """Write a 16:9 cover webp cropped around the centre of `source`."""
    image = load_image(source).convert("RGB")
    target_ratio = COVER_SIZE[0] / COVER_SIZE[1]
    ratio = image.width / image.height
    if ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    elif ratio < target_ratio:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.resize(COVER_SIZE, PILImage.LANCZOS).save(
        destination, format="WEBP", quality=WEBP_QUALITY, method=4
    )
    return destination
