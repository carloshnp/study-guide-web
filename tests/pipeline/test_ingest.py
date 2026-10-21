from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from pipeline.ingest import IngestError, IngestRequest, ingest
from tests.pipeline.helpers import GUIDE_MARKDOWN, git_log, sha256_file


def request(**overrides: object) -> IngestRequest:
    values: dict[str, object] = {
        "guide_id": "aluminio",
        "slug": "aluminio",
        "title": "Alumínio",
        "subject": "metalurgia",
        "type": "teoria",
        "split": 2,
    }
    values.update(overrides)
    return IngestRequest(**values)  # type: ignore[arg-type]


def test_ingest_copies_guide_and_assets_outside_the_guide_folder(
    source_tree: Path, data_root: Path
) -> None:
    result = ingest(source_tree, data_root, request())

    dest = data_root / "guides" / "metalurgia" / "aluminio"
    assert result.status == "new"
    assert result.dest == dest
    assert (dest / "guide.md").read_text(encoding="utf-8") == GUIDE_MARKDOWN
    # asset inside the guide folder keeps its authored path
    assert (dest / "assets" / "local.png").read_bytes() == (
        source_tree.parent / "assets" / "local.png"
    ).read_bytes()
    # asset referenced through ../ lands under assets/__up__/, mirrored
    outside = dest / "assets" / "__up__" / "shared" / "outside.png"
    assert outside.is_file()
    assert outside.read_bytes() == (
        source_tree.parent.parent / "shared" / "outside.png"
    ).read_bytes()

    meta = json.loads((dest / "meta.json").read_text(encoding="utf-8"))
    assert meta["slug"] == "aluminio"
    assert meta["guideId"] == "aluminio"
    assert meta["sourcePath"] == str(source_tree.resolve())
    assert meta["sha256"] == sha256_file(source_tree)
    assert meta["ingestedAt"].endswith("Z")
    assert meta["chapters"] == 2
    assert meta["split"] == 2
    assert meta["assets"] == [
        {
            "link": "assets/local.png",
            "path": "assets/local.png",
            "sha256": sha256_file(source_tree.parent / "assets" / "local.png"),
            "bytes": 13,
        },
        {
            "link": "../shared/outside.png",
            "path": "assets/__up__/shared/outside.png",
            "sha256": sha256_file(source_tree.parent.parent / "shared" / "outside.png"),
            "bytes": 15,
        },
    ]
    assert meta["warnings"] == []


def test_ingest_makes_exactly_one_commit_per_ingest(source_tree: Path, data_root: Path) -> None:
    result = ingest(source_tree, data_root, request())

    log = git_log(data_root)
    assert len(log) == 1
    assert "aluminio" in log[0]
    assert result.commit is not None
    assert log[0].startswith("ingest aluminio")
    # data/ is its own repo, with no remote and a .git directory
    assert (data_root / ".git").is_dir()


def test_reingest_with_the_same_hash_is_a_no_op(source_tree: Path, data_root: Path) -> None:
    first = ingest(source_tree, data_root, request())
    dest = first.dest
    before = (dest / "meta.json").read_text(encoding="utf-8")
    mtimes = {
        p.relative_to(dest): p.stat().st_mtime_ns for p in dest.rglob("*") if p.is_file()
    }

    second = ingest(source_tree, data_root, request())

    assert second.status == "unchanged"
    assert second.commit is None
    assert len(git_log(data_root)) == 1
    assert (dest / "meta.json").read_text(encoding="utf-8") == before
    assert {
        p.relative_to(dest): p.stat().st_mtime_ns for p in dest.rglob("*") if p.is_file()
    } == mtimes


def test_changed_source_reports_drift_and_refuses_to_overwrite(
    source_tree: Path, data_root: Path
) -> None:
    first = ingest(source_tree, data_root, request())
    dest = first.dest
    original = (dest / "guide.md").read_bytes()
    source_tree.write_text(GUIDE_MARKDOWN + "\n## 3. Novo capítulo\n", encoding="utf-8")

    drifted = ingest(source_tree, data_root, request())

    assert drifted.status == "drift"
    assert drifted.commit is None
    assert (dest / "guide.md").read_bytes() == original
    assert len(git_log(data_root)) == 1
    assert drifted.stored_sha256 == first.sha256
    assert drifted.sha256 == sha256_file(source_tree)

    forced = ingest(source_tree, data_root, request(), force=True)

    assert forced.status == "updated"
    assert (dest / "guide.md").read_text(encoding="utf-8").endswith("## 3. Novo capítulo\n")
    assert len(git_log(data_root)) == 2


@pytest.mark.parametrize(
    "name",
    [
        "part-1.md",
        "part-2.md",
        "aluminio-final-baseline.md",
        "aluminio-final-backup.md",
        "BRIEFING.md",
        "BRIEFING-AUDITORIA.md",
        "relatorio-final.md",
        "report-01.md",
    ],
)
def test_ingest_refuses_reports_briefings_backups_and_parts(
    tmp_path: Path, data_root: Path, name: str
) -> None:
    folder = tmp_path / "src" / "outputs" / "metfis_2_aluminio"
    folder.mkdir(parents=True)
    source = folder / name
    source.write_text("# Alumínio\n\n## 1. Cap\n", encoding="utf-8")

    with pytest.raises(IngestError) as excinfo:
        ingest(source, data_root, request())

    message = str(excinfo.value)
    assert name in message
    assert "refus" in message.lower()
    assert not (data_root / "guides").exists()


def test_ingest_refuses_a_source_inside_a_reports_folder(
    tmp_path: Path, data_root: Path
) -> None:
    folder = tmp_path / "src" / "reports" / "aluminio"
    folder.mkdir(parents=True)
    source = folder / "aluminio-final.md"
    source.write_text("# Alumínio\n\n## 1. Cap\n", encoding="utf-8")

    with pytest.raises(IngestError) as excinfo:
        ingest(source, data_root, request())

    assert "reports" in str(excinfo.value)
    assert "refus" in str(excinfo.value).lower()


def test_ingest_refuses_a_non_markdown_source(tmp_path: Path, data_root: Path) -> None:
    source = tmp_path / "guide.pdf"
    source.write_bytes(b"%PDF-1.7")

    with pytest.raises(IngestError) as excinfo:
        ingest(source, data_root, request())

    assert "guide.pdf" in str(excinfo.value)
    assert ".md" in str(excinfo.value)


def test_missing_source_fails_with_the_path(tmp_path: Path, data_root: Path) -> None:
    source = tmp_path / "src" / "missing-guide.md"

    with pytest.raises(IngestError) as excinfo:
        ingest(source, data_root, request())

    assert str(source) in str(excinfo.value)


def test_broken_asset_link_is_reported_not_skipped(source_tree: Path, data_root: Path) -> None:
    source_tree.write_text(
        GUIDE_MARKDOWN + "\n![Quebrada](assets/does-not-exist.png)\n", encoding="utf-8"
    )

    result = ingest(source_tree, data_root, request())

    assert result.status == "new"
    meta = json.loads((result.dest / "meta.json").read_text(encoding="utf-8"))
    assert meta["warnings"] == [
        {
            "link": "assets/does-not-exist.png",
            "reason": "missing asset: "
            + str((source_tree.parent / "assets" / "does-not-exist.png").resolve()),
        }
    ]
    assert result.warnings == meta["warnings"]


def test_ingest_does_not_touch_the_source_folder(source_tree: Path, data_root: Path) -> None:
    before = {
        p: (p.stat().st_mtime_ns, p.stat().st_size)
        for p in source_tree.parent.parent.rglob("*")
    }

    ingest(source_tree, data_root, request())

    after = {
        p: (p.stat().st_mtime_ns, p.stat().st_size)
        for p in source_tree.parent.parent.rglob("*")
    }
    assert after == before


def test_remote_and_data_urls_are_not_copied(source_tree: Path, data_root: Path) -> None:
    source_tree.write_text(
        GUIDE_MARKDOWN
        + "\n![Remota](https://example.com/x.png)\n\n![Inline](data:image/png;base64,AAAA)\n",
        encoding="utf-8",
    )

    result = ingest(source_tree, data_root, request())

    meta = json.loads((result.dest / "meta.json").read_text(encoding="utf-8"))
    assert [a["link"] for a in meta["assets"]] == [
        "assets/local.png",
        "../shared/outside.png",
    ]
    assert meta["warnings"] == []


def test_dry_run_writes_nothing(source_tree: Path, data_root: Path) -> None:
    result = ingest(source_tree, data_root, request(), dry_run=True)

    assert result.status == "would-ingest"
    assert result.chapters == 2
    assert not data_root.exists()


def test_ingest_requires_a_valid_slug(source_tree: Path, data_root: Path) -> None:
    with pytest.raises(IngestError) as excinfo:
        ingest(source_tree, data_root, request(slug="Alumínio Final"))

    assert "slug" in str(excinfo.value)


def test_asset_copy_is_content_addressed_in_meta(source_tree: Path, data_root: Path) -> None:
    result = ingest(source_tree, data_root, request())

    meta = json.loads((result.dest / "meta.json").read_text(encoding="utf-8"))
    for asset in meta["assets"]:
        copied = result.dest / asset["path"]
        assert sha256_file(copied) == asset["sha256"]
        assert copied.stat().st_size == asset["bytes"]


def test_updated_ingest_prunes_assets_no_longer_referenced(
    source_tree: Path, data_root: Path
) -> None:
    first = ingest(source_tree, data_root, request())
    stale = first.dest / "assets" / "__up__" / "shared" / "outside.png"
    assert stale.is_file()

    source_tree.write_text(
        GUIDE_MARKDOWN.replace("![Figura fora da pasta](../shared/outside.png)\n", ""),
        encoding="utf-8",
    )
    ingest(source_tree, data_root, request(), force=True)

    assert not stale.exists()
    assert (first.dest / "assets" / "local.png").is_file()
    meta = json.loads((first.dest / "meta.json").read_text(encoding="utf-8"))
    assert [a["link"] for a in meta["assets"]] == ["assets/local.png"]


def test_meta_json_has_the_contract_keys(source_tree: Path, data_root: Path) -> None:
    result = ingest(source_tree, data_root, request())

    meta = json.loads((result.dest / "meta.json").read_text(encoding="utf-8"))
    for key in ("sourcePath", "sha256", "ingestedAt", "slug", "title", "subject", "type", "split"):
        assert key in meta
    assert os.path.isabs(meta["sourcePath"])


def test_multiple_sources_compose_one_guide(source_tree: Path, data_root: Path) -> None:
    theory = source_tree
    bank = theory.parent / "aluminio-banco.md"
    bank.write_text(
        "# Banco de Questões\n\n## Exercícios\n\n### Questão 1\n\nenunciado\n",
        encoding="utf-8",
    )

    result = ingest([theory, bank], data_root, request())

    dest = data_root / "guides" / "metalurgia" / "aluminio"
    composed = (dest / "guide.md").read_text(encoding="utf-8")
    assert composed == theory.read_text(encoding="utf-8").strip("\n") + "\n\n" + bank.read_text(
        encoding="utf-8"
    ).strip("\n") + "\n"
    assert result.status == "new"
    assert result.chapters == 3  # two theory chapters plus the appended bank
    meta = json.loads((dest / "meta.json").read_text(encoding="utf-8"))
    assert [source["path"] for source in meta["sources"]] == [
        str(theory.resolve()),
        str(bank.resolve()),
    ]
    assert meta["sha256"] == result.sha256
    assert meta["sourcePath"] == str(theory.resolve())


def test_composed_guide_is_unchanged_on_reingest(source_tree: Path, data_root: Path) -> None:
    bank = source_tree.parent / "aluminio-banco.md"
    bank.write_text("# Banco\n\n## Exercícios\n\ncorpo\n", encoding="utf-8")

    first = ingest([source_tree, bank], data_root, request())
    again = ingest([source_tree, bank], data_root, request())

    assert first.status == "new"
    assert again.status == "unchanged"
    assert again.sha256 == first.sha256


def test_editing_the_second_part_of_a_composed_guide_is_drift(
    source_tree: Path, data_root: Path
) -> None:
    bank = source_tree.parent / "aluminio-banco.md"
    bank.write_text("# Banco\n\n## Exercícios\n\ncorpo\n", encoding="utf-8")
    ingest([source_tree, bank], data_root, request())

    bank.write_text("# Banco\n\n## Exercícios\n\ncorpo editado\n", encoding="utf-8")
    again = ingest([source_tree, bank], data_root, request())

    assert again.status == "drift"
    assert again.stored_sha256 != again.sha256


def test_single_source_guide_keeps_its_byte_for_byte_copy(
    source_tree: Path, data_root: Path
) -> None:
    result = ingest([source_tree], data_root, request())

    assert (result.dest / "guide.md").read_bytes() == source_tree.read_bytes()
    meta = json.loads((result.dest / "meta.json").read_text(encoding="utf-8"))
    assert meta["sources"] == [
        {
            "path": str(source_tree.resolve()),
            "sha256": sha256_file(source_tree),
            "bytes": source_tree.stat().st_size,
        }
    ]
