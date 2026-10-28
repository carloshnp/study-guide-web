#!/usr/bin/env python3
"""Audit one or more chapter 9 figure SVGs against their specs.

Checks
  1. the file parses and declares a 1000 unit wide viewBox
  2. every view in the spec's view map has a <g data-view="X">, in the same order
  3. every inventory id (A-01 and the like) appears in the drawing at least once
  4. every view reaches its element floor and stays inside the node budget
  5. every colour is one of the eleven palette roles
  6. every text node carries a size of at least 14 and a label of at most 24 characters
  7. no em or en dash, no external reference, no script or filter or gradient

Usage
  python3 svg_audit.py svg/FIG-09-07-bfs-layers.svg
  python3 svg_audit.py svg/*.svg

Exit 0 when every file is clean, 1 otherwise.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC_DIR = HERE
SVG_NS = "{http://www.w3.org/2000/svg}"

PALETTE = {
    "#15181e", "#5c6470", "#8a92a0", "#e7eaf0", "#ffffff", "#f5f7fa",
    "#1d4ed8", "#eef3fe", "#14357f", "#157347", "#b42318",
}
FORBIDDEN_TAGS = {"script", "foreignObject", "filter", "linearGradient", "radialGradient",
                  "pattern", "clipPath", "mask"}
MIN_FONT = 14
MAX_LABEL = 24
MAX_ELEMENTS = 380
MIN_FONT_BY_CLASS = {"t-id": 18, "t-label": 15, "t-panel": 16, "t-note": 14}


def section(text, key):
    pattern = r"^##\s+%s[.a-z]?\s" % re.escape(str(key))
    match = re.search(pattern, text, re.M)
    if not match:
        return ""
    start = match.end()
    nxt = re.search(r"^##\s+\d", text[start:], re.M)
    return text[start:start + nxt.start()] if nxt else text[start:]


def spec_for(svg_path):
    match = re.search(r"FIG-09-(\d{2})", svg_path.name)
    if not match:
        return None
    hits = sorted(SPEC_DIR.glob("FIG-09-%s-*.md" % match.group(1)))
    return hits[0] if hits else None


def floors(spec_text):
    out, floor_col = [], None
    for line in section(spec_text, 6).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells:
            continue
        low = [c.lower() for c in cells]
        if "element floor" in low:
            floor_col = low.index("element floor")
            continue
        if low[0] == "id":
            break
        if floor_col is None or not re.match(r"^[A-Z][0-9]?$", cells[0]):
            continue
        value = cells[floor_col] if floor_col < len(cells) else ""
        if value.isdigit():
            out.append((cells[0], int(value)))
    return out


def inventory(spec_text):
    """Inventory ids, numeric (A-01) or semantic (A-PANEL), from the section 6 table."""
    ids = []
    for line in section(spec_text, 6).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 3 and re.match(r"^[A-Z]{1,2}-[A-Z0-9]{1,14}(?:-[A-Z0-9]{1,14})*$", cells[0]):
            ids.append(cells[0])
    return ids


def tag(element):
    return element.tag.replace(SVG_NS, "")


def audit(svg_path, verbose=True):
    problems = []
    spec = spec_for(svg_path)
    if spec is None:
        return ["%s: no spec found for this figure number" % svg_path.name], {}
    spec_text = spec.read_text(encoding="utf-8")

    try:
        root = ET.parse(svg_path).getroot()
    except ET.ParseError as exc:
        return ["%s: XML does not parse: %s" % (svg_path.name, exc)], {}

    view_box = root.get("viewBox", "")
    parts = view_box.replace(",", " ").split()
    if len(parts) != 4 or parts[2] != "1000":
        problems.append("%s: viewBox must be '0 0 1000 <H>', found %r" % (svg_path.name, view_box))

    raw = svg_path.read_text(encoding="utf-8")
    for tag_name in FORBIDDEN_TAGS:
        if re.search(r"<%s[\s>]" % tag_name, raw):
            problems.append("%s: forbidden element <%s>" % (svg_path.name, tag_name))
    for href in re.findall(r'(?:href|src)="([^"]+)"', raw):
        if not href.startswith("#"):
            problems.append("%s: external reference %r" % (svg_path.name, href))
    for url in re.findall(r"url\(([^)]+)\)", raw):
        if not url.strip().strip('"').startswith("#"):
            problems.append("%s: external url(%s)" % (svg_path.name, url))

    views = {}
    for group in root.iter():
        name = group.get("data-view")
        if name and tag(group) == "g":
            views[name] = group

    expected = [v for v, _f in floors(spec_text)]
    if not expected:
        problems.append("%s: spec has no view floors in section 6" % svg_path.name)
    for name in expected:
        if name not in views:
            problems.append("%s: spec view %s has no <g data-view=\"%s\">" % (svg_path.name, name, name))
    if [v for v in views] != [v for v in expected if v in views]:
        problems.append("%s: views out of spec order: %s" % (svg_path.name, list(views)))

    found_ids, counts = set(), {}
    for name, group in views.items():
        live = [el for el in group.iter() if el is not group]
        counts[name] = len(live)
        for el in live:
            if el.get("data-el"):
                found_ids.add(el.get("data-el"))
        if len(live) > MAX_ELEMENTS:
            problems.append("%s: view %s has %d elements, over the %d budget"
                            % (svg_path.name, name, len(live), MAX_ELEMENTS))

    for name, floor in floors(spec_text):
        if name in counts and counts[name] < floor:
            problems.append("%s: view %s has %d elements, under its floor %d"
                            % (svg_path.name, name, counts[name], floor))

    spec_ids = inventory(spec_text)
    missing = [i for i in spec_ids if i not in found_ids]
    if missing:
        problems.append("%s: inventory ids not drawn: %s" % (svg_path.name, ", ".join(missing)))
    stray = sorted(i for i in found_ids if i not in spec_ids)
    if stray:
        problems.append("%s: drawn ids absent from the inventory: %s" % (svg_path.name, ", ".join(stray)))

    for hex_value in set(h.lower() for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", raw)):
        if len(hex_value) not in (4, 7):
            problems.append("%s: colour %s is not a 3 or 6 digit hex" % (svg_path.name, hex_value))
        elif hex_value not in PALETTE:
            problems.append("%s: colour %s is outside the palette" % (svg_path.name, hex_value))

    texts = [el for el in root.iter() if tag(el) == "text"]
    if not texts:
        problems.append("%s: no text nodes" % svg_path.name)
    for el in texts:
        body = "".join(el.itertext()).strip()
        size = el.get("font-size")
        if size is None:
            problems.append("%s: text %r has no font-size attribute" % (svg_path.name, body[:20]))
        else:
            try:
                if float(size) < MIN_FONT:
                    problems.append("%s: text %r at %s, under %d" % (svg_path.name, body[:20], size, MIN_FONT))
            except ValueError:
                problems.append("%s: text %r has unreadable font-size %r" % (svg_path.name, body[:20], size))
        classes = (el.get("class") or "").split()
        for cls, floor in MIN_FONT_BY_CLASS.items():
            if cls in classes and size is not None:
                try:
                    if float(size) < floor:
                        problems.append("%s: %s text %r at %s, under %d for that class"
                                        % (svg_path.name, cls, body[:20], size, floor))
                except ValueError:
                    pass
        if len(body) > MAX_LABEL:
            problems.append("%s: label %r is %d characters, over %d"
                            % (svg_path.name, body, len(body), MAX_LABEL))
        if "\u2014" in body or "\u2013" in body:
            problems.append("%s: dash character in %r" % (svg_path.name, body[:20]))

    for el in root.iter():
        for value in (el.get("fill"), el.get("stroke")):
            if value and value.startswith("#") and value.lower() not in PALETTE:
                problems.append("%s: attribute colour %s outside the palette" % (svg_path.name, value))

    stats = {"spec": spec.name, "views": counts, "floors": dict(floors(spec_text)),
             "ids": len(spec_ids), "drawn": len(found_ids), "size": Path(svg_path).stat().st_size}
    return problems, stats


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    failed = 0
    for name in argv[1:]:
        path = Path(name)
        if not path.is_absolute():
            path = Path.cwd() / path
        problems, stats = audit(path)
        if problems:
            failed += 1
            print("FAIL  %s" % path.name)
            for line in problems:
                print("      " + line)
        else:
            views = ", ".join("%s %d/%d" % (v, stats["views"][v], stats["floors"].get(v, 0))
                              for v in stats["views"])
            print("ok    %-34s %s   ids %d/%d   %.1f kB"
                  % (path.name, views, stats["drawn"], stats["ids"], stats["size"] / 1024))
    print("\n%d file(s), %d failing" % (len(argv) - 1, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
