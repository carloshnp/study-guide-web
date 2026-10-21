from __future__ import annotations

from pathlib import Path

from pipeline.catalog import Catalog, GuideEntry, Subject
from pipeline.drift import DriftReport, check_drift
from pipeline.ingest import IngestRequest, ingest
from tests.pipeline.helpers import git_log


def make_catalog(**guides: tuple[str, int]) -> Catalog:
    subjects = (
        Subject(id="metalurgia", title="Metalurgia", order=1),
        Subject(id="programacao", title="Programação", order=2),
    )
    entries = tuple(
        GuideEntry(
            id=guide_id,
            title=guide_id.title(),
            subject=subject,
            type="teoria",
            split=split,
            expected_chapters=1,
            order=index + 1,
            published=True,
        )
        for index, (guide_id, (subject, split)) in enumerate(guides.items())
    )
    return Catalog(version=1, path=Path("catalog.yaml"), subjects=subjects, guides=entries)


def request(guide_id: str = "aluminio", subject: str = "metalurgia") -> IngestRequest:
    return IngestRequest(
        guide_id=guide_id,
        slug=guide_id,
        title=guide_id.title(),
        subject=subject,
        type="teoria",
        split=2,
    )


def test_clean_ingest_reports_ok(source_tree: Path, data_root: Path) -> None:
    result = ingest(source_tree, data_root, request())
    catalog = make_catalog(aluminio=("metalurgia", 2))

    reports = check_drift(catalog, {"aluminio": source_tree}, data_root)

    assert reports == [
        DriftReport(
            guide_id="aluminio",
            slug="aluminio",
            status="ok",
            source=source_tree.resolve(),
            stored_sha256=result.sha256,
            current_sha256=result.sha256,
            chapters=2,
        )
    ]


def test_edited_source_is_reported_as_changed(source_tree: Path, data_root: Path) -> None:
    ingest(source_tree, data_root, request())
    source_tree.write_text("# Alumínio\n\n## 1. Um capítulo\n", encoding="utf-8")
    catalog = make_catalog(aluminio=("metalurgia", 2))

    reports = check_drift(catalog, {"aluminio": source_tree}, data_root)

    assert len(reports) == 1
    report = reports[0]
    assert report.status == "changed"
    assert report.stored_sha256 != report.current_sha256
    assert report.current_sha256 is not None


def test_deleted_source_is_reported_as_missing(source_tree: Path, data_root: Path) -> None:
    ingest(source_tree, data_root, request())
    source_tree.unlink()
    catalog = make_catalog(aluminio=("metalurgia", 2))

    reports = check_drift(catalog, {"aluminio": source_tree}, data_root)

    assert reports[0].status == "missing-source"
    assert reports[0].current_sha256 is None


def test_guide_without_an_ingest_is_reported_as_not_ingested(
    source_tree: Path, data_root: Path
) -> None:
    catalog = make_catalog(
        aluminio=("metalurgia", 2),
        dsa=("programacao", 1),
    )

    reports = check_drift(catalog, {"aluminio": source_tree, "dsa": source_tree}, data_root)

    by_id = {r.guide_id: r for r in reports}
    assert by_id["aluminio"].status == "not-ingested"
    assert by_id["dsa"].status == "not-ingested"


def test_drift_check_never_writes_to_data(source_tree: Path, data_root: Path) -> None:
    ingest(source_tree, data_root, request())
    source_tree.write_text("# Alumínio\n\n## 1. novo\n", encoding="utf-8")
    meta = data_root / "guides" / "metalurgia" / "aluminio" / "meta.json"
    before = meta.read_text(encoding="utf-8")
    catalog = make_catalog(aluminio=("metalurgia", 2))

    check_drift(catalog, {"aluminio": source_tree}, data_root)

    assert meta.read_text(encoding="utf-8") == before
    assert len(git_log(data_root)) == 1
