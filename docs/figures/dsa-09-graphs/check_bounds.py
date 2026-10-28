#!/usr/bin/env python3
"""Fail if any drawn element sits outside its own viewBox.

svg_audit.py checks structure (views, element floors, inventory ids, palette,
type size, label length, no dashes, no external refs). It does not check
geometry against the canvas, so a label or node can hang off the edge and still
pass. This closes that gap.

Checks rect/circle/text x,y,width,height,cx,cy,r and path endpoints in absolute
coordinates. Relative commands (lowercase) are skipped: this is a cheap guard,
not a renderer.

Usage:
    python3 check_bounds.py            # all figures
    python3 check_bounds.py svg/FIG-09-02-representations.svg
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
SLACK = 1.0  # antialias and marker overhang

NUM = r"(-?\d+(?:\.\d+)?)"
ABS_PATH = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|" + NUM)


def viewbox(svg: str) -> tuple[float, float]:
    m = re.search(r'viewBox="([\d.\s-]+)"', svg)
    if not m:
        raise SystemExit("no viewBox")
    parts = [float(v) for v in m.group(1).split()]
    return parts[2], parts[3]


def attr(tag: str, name: str) -> float | None:
    m = re.search(rf'\b{re.escape(name)}="({NUM})"', tag)
    return float(m.group(1)) if m else None


def absolute_path_points(d: str) -> list[tuple[float, float]]:
    """Collect endpoints of absolute-coordinate path commands."""
    pts: list[tuple[float, float]] = []
    x = y = 0.0
    for cmd, args in _commands(d):
        if cmd.islower():
            continue
        try:
            if cmd in "MLT":
                for i in range(0, len(args) - 1, 2):
                    x, y = args[i], args[i + 1]
                    pts.append((x, y))
            elif cmd == "H" and args:
                x = args[-1]
                pts.append((x, y))
            elif cmd == "V" and args:
                y = args[-1]
                pts.append((x, y))
            elif cmd in "CSQ":
                x, y = args[-2], args[-1]
                pts.append((x, y))
            elif cmd == "A" and len(args) >= 7:
                x, y = args[5], args[6]
                pts.append((x, y))
        except IndexError:
            continue
    return pts


def _commands(d: str):
    """Split a path d into (command, numeric args) pairs."""
    tokens = re.findall(r"[MmLlHhVvCcSsQqTtAaZz]|-?\d+(?:\.\d+)?", d)
    cmd = None
    buf: list[float] = []
    for tok in tokens:
        if tok.isalpha():
            if cmd is not None:
                yield cmd, buf
            cmd, buf = tok, []
        else:
            buf.append(float(tok))
    if cmd is not None:
        yield cmd, buf


def check(path: Path) -> list[str]:
    svg = path.read_text()
    W, H = viewbox(svg)
    bad: list[str] = []

    for m in re.finditer(r"<(rect|text|circle)\b[^>]*>", svg):
        tag = m.group(0)
        kind = m.group(1)
        el = re.search(r'data-el="([^"]+)"', tag)
        label = el.group(1) if el else kind
        x, y = attr(tag, "x"), attr(tag, "y")
        w, h = attr(tag, "width"), attr(tag, "height")
        cx, cy, r = attr(tag, "cx"), attr(tag, "cy"), attr(tag, "r")
        if x is not None and not (-SLACK <= x <= W + SLACK):
            bad.append(f"{label}: x={x} outside 0..{W}")
        if y is not None and not (-SLACK <= y <= H + SLACK):
            bad.append(f"{label}: y={y} outside 0..{H}")
        if w is not None and x is not None and x + w > W + SLACK:
            bad.append(f"{label}: x+w={x + w:.1f} past {W}")
        if h is not None and y is not None and y + h > H + SLACK:
            bad.append(f"{label}: y+h={y + h:.1f} past {H}")
        if cx is not None and r is not None and not (-SLACK <= cx - r and cx + r <= W + SLACK):
            bad.append(f"{label}: cx+r={cx + r:.1f} past {W}")
        if cy is not None and r is not None and not (-SLACK <= cy - r and cy + r <= H + SLACK):
            bad.append(f"{label}: cy+r={cy + r:.1f} past {H}")

    for m in re.finditer(r'<path\b[^>]*\bd="([^"]+)"[^>]*>', svg):
        tag = m.group(0)
        el = re.search(r'data-el="([^"]+)"', tag)
        label = el.group(1) if el else "path"
        for px, py in absolute_path_points(m.group(1)):
            if not (-SLACK <= px <= W + SLACK):
                bad.append(f"{label}: path x={px} outside 0..{W}")
                break
            if not (-SLACK <= py <= H + SLACK):
                bad.append(f"{label}: path y={py} outside 0..{H}")
                break

    return bad


def main() -> int:
    targets = [Path(a) for a in sys.argv[1:]] or sorted((BASE / "svg").glob("*.svg"))
    failing = 0
    for path in targets:
        problems = check(path)
        if problems:
            failing += 1
            print(f"FAIL {path.name}")
            for p in problems[:6]:
                print(f"     {p}")
        else:
            print(f"ok   {path.name}")
    print(f"\n{len(targets)} file(s), {failing} failing")
    return 1 if failing else 0


if __name__ == "__main__":
    raise SystemExit(main())
