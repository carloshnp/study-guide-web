#!/usr/bin/env python3
"""Chapter level audit for the chapter 9 illustration specs.

Runs the skill's per file audit, then checks the things a single file audit cannot see:
identity of the file with its requirement prefix, canvas agreement across the chapter,
palette containment, anchor validity against the built chapter, and the element floors.

Usage
  python3 verify_specs.py            # audit every expected figure
  python3 verify_specs.py --list     # print the expected roster and exit

Exit 0 when every figure passes, 1 otherwise. A passing run means the specs are
mechanically consistent. It does not mean the figures are well composed, which no script
can decide.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHAPTER = Path("/home/carloshnp/study-site/content/guides/dsa/chapters/09-graphs.json")
CHECK = Path("/home/carloshnp/.hermes/skills/svg/illustration-spec/scripts/check_spec.py")

# figure id, file, requirement prefix, anchor section id
ROSTER = [
    (1, "FIG-09-01-graph-anatomy.md", "REQ-FIG0901-", "911-what-a-graph-records"),
    (2, "FIG-09-02-representations.md", "REQ-FIG0902-", "911-what-a-graph-records"),
    (3, "FIG-09-03-components.md", "REQ-FIG0903-", "921-components-the-first-decomposition"),
    (4, "FIG-09-04-order-or-cycle.md", "REQ-FIG0904-", "922-orderings-when-the-edges-point-forward"),
    (5, "FIG-09-05-weight-and-detour.md", "REQ-FIG0905-", "923-paths-distance-and-the-worked-example"),
    (6, "FIG-09-06-spec-anatomy.md", "REQ-FIG0906-", "931-reading-an-invariant"),
    (7, "FIG-09-07-bfs-layers.md", "REQ-FIG0907-", "932-breadth-first-search"),
    (8, "FIG-09-08-dfs-time.md", "REQ-FIG0908-", "933-depth-first-search"),
    (9, "FIG-09-09-dijkstra-order.md", "REQ-FIG0909-", "934-dijkstra-for-weighted-shortest-paths"),
    (10, "FIG-09-10-toposort-prepend.md", "REQ-FIG0910-", "935-topological-order-and-cycle-detection"),
    (11, "FIG-09-11-when-final.md", "REQ-FIG0911-", "935-topological-order-and-cycle-detection"),
]

PALETTE = {
    "#15181e", "#e8eaef", "#5c6470", "#a3abba", "#8a92a0", "#7b8496",
    "#e7eaf0", "#262b36", "#ffffff", "#f5f7fa", "#111522", "#1d4ed8",
    "#7aa2ff", "#eef3fe", "#16213c", "#14357f", "#c7d6ff", "#157347",
    "#4ade80", "#b42318", "#f87171",
}

CANVAS_WIDTH = "1000"
MAX_LINES = 220


def section(text, key):
    """Body of '## <key>.' up to the next '## '."""
    pattern = r"^##\s+%s[.a-z]?\s" % re.escape(str(key))
    match = re.search(pattern, text, re.M)
    if not match:
        return ""
    start = match.end()
    nxt = re.search(r"^##\s+\d", text[start:], re.M)
    return text[start:start + nxt.start()] if nxt else text[start:]


def figures(text):
    """View rows with their element floor, located by header name, not by position."""
    rows = []
    floor_col = None
    for line in section(text, 6).splitlines():
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
            rows.append((cells[0], int(value)))
    return rows


def requirements(text):
    return re.findall(r"^- (REQ-[A-Za-z0-9]+-\d+)\s+\[", section(text, 7) or text, re.M)


def main():
    if "--list" in sys.argv:
        for num, name, _p, anchor in ROSTER:
            print("FIG-09-%02d  %-36s  %s" % (num, name, anchor))
        return 0

    anchors = set()
    try:
        data = json.loads(CHAPTER.read_text())
        anchors = {s["id"] for s in data.get("sections", [])}
    except (OSError, json.JSONDecodeError) as exc:
        print("cannot read chapter sections: %s" % exc)
        return 1

    problems = []
    rows = []
    for num, name, prefix, anchor in ROSTER:
        path = HERE / name
        if not path.exists():
            problems.append("%s missing" % name)
            continue
        text = path.read_text(encoding="utf-8")
        lines = text.count("\n") + 1

        audit = subprocess.run([sys.executable, str(CHECK), str(path)],
                               capture_output=True, text=True)
        last = (audit.stdout.strip().splitlines() or ["no output"])[-1]
        if audit.returncode != 0:
            fails = [l for l in audit.stdout.splitlines() if l.startswith("FAIL")]
            problems.extend("%s: %s" % (name, f) for f in fails)
            if not fails:
                problems.append("%s: audit exited %d (%s)" % (name, audit.returncode, last))

        if lines > MAX_LINES:
            problems.append("%s: %d lines, over the %d line ceiling" % (name, lines, MAX_LINES))

        reqs = requirements(text)
        foreign = [r for r in reqs if not r.startswith(prefix)]
        if not reqs:
            problems.append("%s: no requirements with prefix %s" % (name, prefix))
        if foreign:
            problems.append("%s: requirement ids outside the figure prefix: %s"
                            % (name, ", ".join(sorted(set(foreign)))))

        hexes = set(h.lower() for h in re.findall(r"#[0-9a-fA-F]{6}\b", text))
        stray = sorted(hexes - PALETTE)
        if stray:
            problems.append("%s: hex values outside the locked palette: %s"
                            % (name, ", ".join(stray)))

        if CANVAS_WIDTH not in section(text, 4):
            problems.append("%s: section 4 does not declare the %s unit canvas"
                            % (name, CANVAS_WIDTH))

        if anchor not in text:
            problems.append("%s: does not name its anchor section id %s" % (name, anchor))
        if anchor not in anchors:
            problems.append("%s: anchor %s is not a section id of the built chapter"
                            % (name, anchor))

        tops = figures(text)
        if not tops:
            problems.append("%s: section 6 yields no view with a numeric element floor" % name)
        rows.append((num, name, last, len(reqs), len(tops), sum(f for _v, f in tops), lines))

    width = max((len(r[1]) for r in rows), default=10)
    print("%-4s %-*s %-26s %5s %6s %6s %5s"
          % ("id", width, "file", "audit", "reqs", "views", "floor", "lines"))
    for num, name, last, nreq, nview, floor, lines in rows:
        flag = "ok" if "0 findings" in last else last
        print("%-4d %-*s %-26s %5d %6d %6d %5d"
              % (num, width, name, flag, nreq, nview, floor, lines))

    print("\nfigures audited: %d/%d" % (len(rows), len(ROSTER)))
    if problems:
        print("problems: %d" % len(problems))
        for p in problems:
            print("  FAIL  " + p)
        return 1
    print("problems: 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
