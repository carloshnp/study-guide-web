#!/usr/bin/env python3
"""Insert the chapter 9 figures into the canonical DSA guide and stage their assets.

The guide is data/guides/programacao/dsa/guide.md; the pipeline resolves a relative image
link against the guide's own folder, so the SVGs are copied to figures/ beside it and
referenced relatively. The caption of each figure is the markdown alt text, so the alt is
written as the sentence a reader should read under the picture.

Idempotent: a figure already present is not inserted twice.

Usage
  python3 integrate_figures.py --check     # report anchors and existing figures only
  python3 integrate_figures.py             # copy assets and insert
"""

import argparse
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SVG_DIR = HERE / "svg"
GUIDE_DIR = Path("/home/carloshnp/study-site/data/guides/programacao/dsa")
GUIDE = GUIDE_DIR / "guide.md"
ASSET_DIR = GUIDE_DIR / "figures"

FIGURES = [
    ("FIG-09-01", "FIG-09-01-graph-anatomy.svg",
     "A graph with no edges at all is called an empty graph, and its vertices are isolated.",
     "The vocabulary on one sheet: undirected edges with their degrees, the same vertices as a "
     "directed graph with in-degree and out-degree, a weighted edge, and an isolated vertex."),
    ("FIG-09-02", "FIG-09-02-representations.svg",
     "both appear in the Dasgupta, Papadimitriou, Vazirani text beside the decompositions that use them.",
     "Two representations of the same eight vertices: an adjacency list of sixteen entries and an "
     "adjacency matrix of sixty-four cells, sixteen of them holding an edge."),
    ("FIG-09-03", "FIG-09-03-components.svg",
     "Decomposing this way costs one traversal of the whole graph, and every later question about the graph can be asked one component at a time.",
     "One graph, three pieces: the component on five vertices, the pair, and the isolated vertex, "
     "with a subset that is connected but not maximal beside them."),
    ("FIG-09-04", "FIG-09-04-order-or-cycle.svg",
     "The order matters in practice because it is the sequence in which work may safely proceed: "
     "$t$ may be processed only after $c$, and $c$ only after both $a$ and $b$.",
     "Two valid topological orders of the same five arcs, and the same graph with one arc added, "
     "where the cycle forbids any order at all."),
    ("FIG-09-05", "FIG-09-05-weight-and-detour.svg",
     "This is the whole reason a shortest path algorithm cannot simply prefer long edges or short edges: cost is a sum, and the cheapest route is the one whose sum is smallest.",
     "The weighted sample graph with its shortest path tree and its running sums, and the two "
     "routes leaving a drawn as bars: thirteen against eleven."),
    ("FIG-09-06", "FIG-09-06-spec-anatomy.svg",
     "Once the loop ends, the loop condition and the invariant combine to yield the postcondition. "
     "This is the same shape that the invariant drills of chapter 2 used, applied now to graph traversals.",
     "A specification as three parts around one loop, with the cost as the fourth: precondition, "
     "invariant, postcondition, and the work it costs."),
    ("FIG-09-07", "FIG-09-07-bfs-layers.svg",
     "The invariant explains the layer structure: when a vertex is dequeued, its distance is final, so the first time any vertex is reached is already by a shortest path.",
     "BFS in layers: the queue at each of six steps, and the distance chip that becomes final when "
     "its vertex enters the queue."),
    ("FIG-09-08", "FIG-09-08-dfs-time.svg",
     "The invariant makes the nesting visible: a vertex is active exactly while it sits on the current path, and it becomes finished only after every branch below it has been explored.",
     "DFS as nested time: the active path as frames, and discover and finish intervals that "
     "contain one another."),
    ("FIG-09-09", "FIG-09-09-dijkstra-order.svg",
     "The nonnegative weight precondition is not decoration: a negative edge can make a settled vertex suddenly reachable by a cheaper route, and the invariant would then be false.",
     "Dijkstra settling in cost order, and the same algorithm on one negative edge, where a "
     "settled value is already wrong."),
    ("FIG-09-10", "FIG-09-10-toposort-prepend.svg",
     "With this listing the specification half of the chapter is complete: one numbered contract per question, each with the invariant that its implementation must preserve, and the next subsection transcribes all four into running code.",
     "Toposort by prepending: the list grows at the left as vertices finish, and a back edge to an "
     "active vertex reports the cycle."),
    ("FIG-09-11", "FIG-09-11-when-final.svg",
     "With this listing the specification half of the chapter is complete: one numbered contract per question, each with the invariant that its implementation must preserve, and the next subsection transcribes all four into running code.",
     "The same vertex trusted at three different events: first reach in BFS, last branch closed in "
     "DFS, and extraction in Dijkstra."),
]


def paragraphs(text):
    """Split on blank lines, keeping the exact source spans."""
    spans, start = [], 0
    for block in text.split("\n\n"):
        end = start + len(block)
        spans.append((start, end, block))
        start = end + 2
    return spans


def anchor_span(text, sentence):
    hits = [(s, e, block) for s, e, block in paragraphs(text) if sentence in block]
    if len(hits) != 1:
        return None, len(hits)
    return hits[0], 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if not GUIDE.is_file():
        print("guide not found: %s" % GUIDE)
        return 1
    text = GUIDE.read_text(encoding="utf-8")
    original = text

    missing_svg = [name for _fid, name, _a, _alt in FIGURES if not (SVG_DIR / name).is_file()]
    if missing_svg:
        print("missing SVG sources: %s" % ", ".join(missing_svg))
        if not args.check:
            return 1

    problems, inserts = [], []
    for fid, name, sentence, alt in FIGURES:
        span, count = anchor_span(text, sentence)
        if span is None:
            problems.append("%s: anchor sentence matches %d paragraphs, expected 1" % (fid, count))
            continue
        if ("figures/%s" % name) in text:
            print("%s: already present, skipped" % fid)
            continue
        inserts.append((span[1], fid, name, alt))

    for problem in problems:
        print("FAIL  " + problem)
    if problems:
        return 1

    print("%d figure(s) to insert" % len(inserts))
    if args.check:
        return 0

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for _fid, name, _sentence, _alt in FIGURES:
        source = SVG_DIR / name
        if source.is_file():
            shutil.copyfile(source, ASSET_DIR / name)
            print("copied %s" % name)

    for end, fid, name, alt in sorted(inserts, reverse=True):
        line = "\n\n![%s](figures/%s)" % (alt, name)
        text = text[:end] + line + text[end:]
        print("inserted %s after offset %d" % (fid, end))

    GUIDE.write_text(text, encoding="utf-8")
    print("\nguide lines %d -> %d" % (original.count("\n") + 1, text.count("\n") + 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
