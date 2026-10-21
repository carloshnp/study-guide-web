from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.catalog import Catalog, CatalogError, GuideEntry, Subject, load, load_sources

VALID = """\
version: 1
subjects:
  - {id: metalurgia, title: Metalurgia, order: 1}
  - {id: programacao, title: Programação, order: 2}
guides:
  - id: aluminio
    title: Alumínio
    subject: metalurgia
    type: teoria
    split: 2
    expected_chapters: 29
    order: 1
    published: true
  - id: dsa
    title: DSA Guide
    subject: programacao
    type: banco
    split: 1
    expected_chapters: 12
    published: false
"""


def write(tmp_path: Path, text: str, name: str = "catalog.yaml") -> Path:
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return path


def test_loads_valid_catalog_into_typed_entries(tmp_path: Path) -> None:
    catalog = load(write(tmp_path, VALID))

    assert isinstance(catalog, Catalog)
    assert catalog.version == 1
    assert catalog.subjects == (
        Subject(id="metalurgia", title="Metalurgia", order=1),
        Subject(id="programacao", title="Programação", order=2),
    )
    assert len(catalog.guides) == 2
    aluminio = catalog.guide("aluminio")
    assert isinstance(aluminio, GuideEntry)
    assert aluminio.split == 2
    assert aluminio.expected_chapters == 29
    assert aluminio.published is True
    assert aluminio.order == 1
    dsa = catalog.guide("dsa")
    assert dsa.type == "banco"
    assert dsa.published is False
    # `order` falls back to position when omitted.
    assert dsa.order == 2
    assert [g.id for g in catalog.published_guides()] == ["aluminio"]


def test_missing_split_names_the_file_and_the_field(tmp_path: Path) -> None:
    text = VALID.replace("    split: 2\n", "")
    path = write(tmp_path, text)

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    message = str(excinfo.value)
    assert str(path) in message
    assert "split" in message
    assert "aluminio" in message


def test_unknown_subject_fails_naming_the_field(tmp_path: Path) -> None:
    text = VALID.replace("    subject: metalurgia", "    subject: quimica")
    path = write(tmp_path, text)

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    message = str(excinfo.value)
    assert str(path) in message
    assert "subject" in message
    assert "quimica" in message


def test_unknown_type_fails(tmp_path: Path) -> None:
    path = write(tmp_path, VALID.replace("    type: teoria", "    type: resumo"))

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    assert "type" in str(excinfo.value)
    assert "resumo" in str(excinfo.value)


def test_split_out_of_range_fails(tmp_path: Path) -> None:
    path = write(tmp_path, VALID.replace("    split: 2", "    split: 9"))

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    assert "split" in str(excinfo.value)
    assert str(path) in str(excinfo.value)


def test_expected_chapters_must_be_a_positive_int(tmp_path: Path) -> None:
    path = write(tmp_path, VALID.replace("    expected_chapters: 29", "    expected_chapters: 0"))

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    assert "expected_chapters" in str(excinfo.value)


def test_duplicate_guide_id_fails(tmp_path: Path) -> None:
    duplicate = "".join(
        [
            "  - id: aluminio\n",
            "    title: Outro alumínio\n",
            "    subject: metalurgia\n",
            "    type: teoria\n",
            "    split: 2\n",
            "    expected_chapters: 3\n",
        ]
    )
    path = write(tmp_path, VALID + duplicate)

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    assert "duplicate" in str(excinfo.value).lower()
    assert "aluminio" in str(excinfo.value)


def test_missing_catalog_file_fails_with_the_path(tmp_path: Path) -> None:
    path = tmp_path / "nope.yaml"

    with pytest.raises(CatalogError) as excinfo:
        load(path)

    assert str(path) in str(excinfo.value)


def test_real_catalog_publishes_the_measured_guides(repo_root: Path) -> None:
    catalog = load(repo_root / "catalog.yaml")

    measured = {
        "aluminio": (2, 29),
        "titanio": (2, 39),
        # 6 theory chapters + 3 promoted appendices (banco, referência, glossário).
        "magnesio": (2, 9),
        "dsa": (1, 12),
        "llm-l0l1": (2, 14),
        # Resistência dos Materiais (EEA338) and its P1 review, which is 34 and
        # not 39 because six empty dividers are not chapters.
        "isostatica": (2, 14),
        "tensao-normal": (2, 14),
        "torcao": (2, 9),
        "resmat-p1": (2, 34),
        # Cálculo Numérico: four modules, each one guide composed of its theory
        # plus the question bank, which closes the module as its last chapter.
        "cn-taylor": (2, 12),
        "cn-erros": (2, 18),
        "cn-sistemas": (2, 20),
        "cn-contorno": (2, 25),
    }
    assert {g.id: (g.split, g.expected_chapters) for g in catalog.guides} == measured
    assert {g.subject for g in catalog.guides} <= {s.id for s in catalog.subjects}
    assert all(g.published for g in catalog.guides)


def test_load_sources_maps_ids_to_absolute_paths(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        'guides:\n  aluminio: "/run/media/x/aluminio-final.md"\n',
        name="sources.local.yaml",
    )

    sources = load_sources(path)

    assert sources == {"aluminio": (Path("/run/media/x/aluminio-final.md"),)}


def test_load_sources_accepts_a_list_of_files_per_guide(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "guides:\n"
        "  cn-taylor:\n"
        '    - "/run/media/x/modulo1-taylor.md"\n'
        '    - "/run/media/x/modulo1-taylor-questoes.md"\n',
        name="sources.local.yaml",
    )

    sources = load_sources(path)

    assert sources == {
        "cn-taylor": (
            Path("/run/media/x/modulo1-taylor.md"),
            Path("/run/media/x/modulo1-taylor-questoes.md"),
        )
    }


def test_load_sources_rejects_a_relative_path_in_a_list(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        'guides:\n  cn-taylor:\n    - "modulo1-taylor.md"\n',
        name="sources.local.yaml",
    )

    with pytest.raises(CatalogError) as excinfo:
        load_sources(path)

    assert "absolute source path" in str(excinfo.value)


def test_load_sources_missing_file_names_the_path(tmp_path: Path) -> None:
    path = tmp_path / "sources.local.yaml"

    with pytest.raises(CatalogError) as excinfo:
        load_sources(path)

    assert str(path) in str(excinfo.value)
