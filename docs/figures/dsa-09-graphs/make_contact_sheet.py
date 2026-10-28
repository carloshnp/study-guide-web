#!/usr/bin/env python3
"""Rebuild render/contact-sheet.png from every SVG in svg/.

Each figure is rasterised at 1000 px wide with rsvg-convert, then stacked
vertically on a light card with its filename as a caption. The sheet is what a
human reviews when deciding whether the whole chapter reads as one system:
consistent stroke weights, one accent, aligned margins, no figure visually
louder than the argument it serves.

Usage:
    python3 make_contact_sheet.py            # rebuild the sheet
    python3 make_contact_sheet.py --width 520
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
SVG_DIR = BASE / "svg"
RENDER_DIR = BASE / "render"
SHEET = RENDER_DIR / "contact-sheet.png"

CARD = (255, 255, 255)
INK = (21, 24, 30)
RULE = (231, 234, 240)

CAPTION_H = 26
GAP = 18
MARGIN = 24
FONT_SIZE = 15


def font() -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        if Path(name).exists():
            return ImageFont.truetype(name, FONT_SIZE)
    return ImageFont.load_default()


def rasterise(svg: Path, width: int) -> Path:
    out = RENDER_DIR / f"{svg.stem}.png"
    subprocess.run(
        ["rsvg-convert", "--width", str(width), "--format", "png",
         "--output", str(out), str(svg)],
        check=True, capture_output=True,
    )
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=1000)
    args = ap.parse_args()

    svgs = sorted(SVG_DIR.glob("*.svg"))
    if not svgs:
        print(f"no svg files in {SVG_DIR}", file=sys.stderr)
        return 1

    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    thumbs: list[tuple[str, Image.Image]] = []
    for svg in svgs:
        png = rasterise(svg, args.width)
        im = Image.open(png).convert("RGB")
        thumbs.append((svg.stem, im))
        print(f"rendered {svg.stem:34s} {im.width}x{im.height}")

    w = max(im.width for _, im in thumbs) + MARGIN * 2
    h = MARGIN
    for _, im in thumbs:
        h += im.height + CAPTION_H + GAP
    h += MARGIN - GAP

    sheet = Image.new("RGB", (w, h), CARD)
    d = ImageDraw.Draw(sheet)
    f = font()

    y = MARGIN
    for name, im in thumbs:
        d.text((MARGIN, y), name, fill=INK, font=f)
        y += CAPTION_H
        sheet.paste(im, (MARGIN, y))
        d.line([(MARGIN, y - 6), (MARGIN + im.width, y - 6)], fill=RULE)
        y += im.height + GAP

    sheet.save(SHEET)
    print(f"\nsheet {sheet.width}x{sheet.height} -> {SHEET}")
    print(f"{len(thumbs)} figure(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
