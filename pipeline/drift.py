"""Report sources that changed since they were ingested.

Drift is reported, never merged: the copy in `data/` stays canonical until the
operator runs `python -m pipeline.ingest --all --force`.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

from pipeline.catalog import Catalog, CatalogError, load, load_sources
from pipeline.ingest import REPO_ROOT, IngestError, sha256_file

PROBLEM_STATUSES = frozenset({"changed", "missing-source"})


@dataclass(frozen=True)
class DriftReport:
    """Comparison between one stored guide and its source file."""

    guide_id: str
    slug: str
    status: str  # ok | changed | missing-source | not-ingested
    source: Path | None
    stored_sha256: str | None
    current_sha256: str | None
    chapters: int | None


def _read_meta(dest: Path) -> dict[str, object] | None:
    meta_path = dest / "meta.json"
    if not meta_path.is_file():
        return None
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise IngestError(f"{meta_path}: corrupt meta.json: {exc}") from exc


def check_drift(
    catalog: Catalog, sources: dict[str, Path], data_root: str | Path
) -> list[DriftReport]:
    """One report per catalog guide, in catalog order. Read-only."""
    data_path = Path(data_root)
    reports: list[DriftReport] = []
    for guide in catalog.guides:
        source = sources.get(guide.id)
        resolved = source.expanduser().resolve() if source is not None else None
        dest = data_path / "guides" / guide.subject / guide.id
        meta = _read_meta(dest)
        stored = meta.get("sha256") if meta else None
        chapters = meta.get("chapters") if meta else None
        chapters = chapters if isinstance(chapters, int) else None

        if meta is None:
            current = sha256_file(resolved) if resolved is not None and resolved.is_file() else None
            reports.append(
                DriftReport(
                    guide_id=guide.id,
                    slug=str(dest.name),
                    status="not-ingested",
                    source=resolved,
                    stored_sha256=None,
                    current_sha256=current,
                    chapters=None,
                )
            )
            continue

        if resolved is None or not resolved.is_file():
            reports.append(
                DriftReport(
                    guide_id=guide.id,
                    slug=str(dest.name),
                    status="missing-source",
                    source=resolved,
                    stored_sha256=stored if isinstance(stored, str) else None,
                    current_sha256=None,
                    chapters=chapters,
                )
            )
            continue

        current = sha256_file(resolved)
        status = "ok" if stored == current else "changed"
        reports.append(
            DriftReport(
                guide_id=guide.id,
                slug=str(dest.name),
                status=status,
                source=resolved,
                stored_sha256=stored if isinstance(stored, str) else None,
                current_sha256=current,
                chapters=chapters,
            )
        )
    return reports


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.drift",
        description="Report guides whose source changed since ingest.",
    )
    parser.add_argument("--data-root", type=Path, default=REPO_ROOT / "data")
    parser.add_argument("--catalog", type=Path, default=REPO_ROOT / "catalog.yaml")
    parser.add_argument("--sources", type=Path, default=REPO_ROOT / "sources.local.yaml")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = parser.parse_args(argv)

    try:
        catalog = load(args.catalog)
        sources = load_sources(args.sources)
        reports = check_drift(catalog, sources, args.data_root)
    except (CatalogError, IngestError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.json:
        payload = [
            {**asdict(report), "source": str(report.source) if report.source else None}
            for report in reports
        ]
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        for report in reports:
            stored = (report.stored_sha256 or "-")[:12]
            current = (report.current_sha256 or "-")[:12]
            print(
                f"{report.guide_id:<12} {report.status:<15} "
                f"stored={stored:<13} current={current:<13} "
                f"chapters={report.chapters if report.chapters is not None else '-':<4} "
                f"{report.source or ''}"
            )

    problems = [report.guide_id for report in reports if report.status in PROBLEM_STATUSES]
    if problems:
        print(
            f"drift: {', '.join(problems)} changed or disappeared since ingest; "
            "review the diff, then rerun with --force",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
