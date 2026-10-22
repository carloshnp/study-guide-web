"""Load and validate the curated catalog and the local source map.

`catalog.yaml` is public and lists what is published. `sources.local.yaml` is
gitignored and maps a guide id to the absolute path of its source markdown.

Both loaders are strict on purpose: a typo in the catalog must fail with the
file and the field named instead of silently dropping a guide.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Mapping

import yaml

GUIDE_TYPES: tuple[str, ...] = ("teoria", "banco", "referencia", "glossario", "apendice")

GUIDE_REQUIRED: tuple[str, ...] = (
    "id",
    "title",
    "subject",
    "type",
    "split",
    "expected_chapters",
)
GUIDE_OPTIONAL: tuple[str, ...] = ("order", "published", "updated", "cover", "group")
SUBJECT_REQUIRED: tuple[str, ...] = ("id", "title")
SUBJECT_OPTIONAL: tuple[str, ...] = ("order",)
GROUP_REQUIRED: tuple[str, ...] = ("id", "title", "subject")
GROUP_OPTIONAL: tuple[str, ...] = ("order",)

MIN_SPLIT = 1
MAX_SPLIT = 6

_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")


class CatalogError(ValueError):
    """Raised when the catalog or the source map is missing or invalid."""


@dataclass(frozen=True)
class Subject:
    """A group of guides shown together on the site."""

    id: str
    title: str
    order: int


@dataclass(frozen=True)
class Group:
    """A folder of guides inside one subject, e.g. Não-Ferrosos under Metalurgia."""

    id: str
    title: str
    subject: str
    order: int


@dataclass(frozen=True)
class GuideEntry:
    """One published guide."""

    id: str
    title: str
    subject: str
    type: str
    split: int
    expected_chapters: int
    order: int
    published: bool
    updated: str | None = None
    group: str | None = None


@dataclass(frozen=True)
class Catalog:
    """The validated contents of `catalog.yaml`."""

    version: int
    path: Path
    subjects: tuple[Subject, ...]
    guides: tuple[GuideEntry, ...]
    groups: tuple[Group, ...] = ()

    def subject(self, subject_id: str) -> Subject:
        for subject in self.subjects:
            if subject.id == subject_id:
                return subject
        raise CatalogError(f"{self.path}: unknown subject id {subject_id!r}")

    def guide(self, guide_id: str) -> GuideEntry:
        for guide in self.guides:
            if guide.id == guide_id:
                return guide
        raise CatalogError(f"{self.path}: unknown guide id {guide_id!r}")

    def published_guides(self) -> tuple[GuideEntry, ...]:
        return tuple(guide for guide in self.guides if guide.published)

    def group(self, group_id: str) -> Group:
        for group in self.groups:
            if group.id == group_id:
                return group
        raise CatalogError(f"{self.path}: unknown group id {group_id!r}")

    def groups_of(self, subject_id: str) -> tuple[Group, ...]:
        """Groups of one subject, by `order` then id."""
        return tuple(
            sorted(
                (group for group in self.groups if group.subject == subject_id),
                key=lambda group: (group.order, group.id),
            )
        )


def _require_mapping(path: Path, where: str, value: Any) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise CatalogError(
            f"{path}: {where}: expected a mapping, got {type(value).__name__}"
        )
    return value


def _require_list(path: Path, where: str, value: Any) -> list[Any]:
    if not isinstance(value, list):
        raise CatalogError(f"{path}: {where}: expected a list, got {type(value).__name__}")
    return value


def _require_str(path: Path, where: str, field: str, value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CatalogError(f"{path}: {where}: field '{field}' must be a non-empty string")
    return value.strip()


def _require_int(
    path: Path, where: str, field: str, value: Any, *, minimum: int, maximum: int | None = None
) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise CatalogError(f"{path}: {where}: field '{field}' must be an integer, got {value!r}")
    if value < minimum:
        raise CatalogError(f"{path}: {where}: field '{field}' must be >= {minimum}, got {value}")
    if maximum is not None and value > maximum:
        raise CatalogError(f"{path}: {where}: field '{field}' must be <= {maximum}, got {value}")
    return value


def _require_bool(path: Path, where: str, field: str, value: Any) -> bool:
    if not isinstance(value, bool):
        raise CatalogError(f"{path}: {where}: field '{field}' must be true or false, got {value!r}")
    return value


def _check_unknown_fields(
    path: Path, where: str, entry: Mapping[str, Any], allowed: tuple[str, ...]
) -> None:
    for key in entry:
        if key not in allowed:
            raise CatalogError(
                f"{path}: {where}: unknown field {key!r} "
                f"(allowed: {', '.join(allowed)})"
            )


def _check_slug(path: Path, where: str, field: str, value: str) -> str:
    if not _ID_RE.match(value):
        raise CatalogError(
            f"{path}: {where}: field '{field}' must be a lowercase slug "
            f"matching {_ID_RE.pattern}, got {value!r}"
        )
    return value


def _load_subjects(path: Path, raw: list[Any]) -> tuple[Subject, ...]:
    subjects: list[Subject] = []
    seen: set[str] = set()
    allowed = SUBJECT_REQUIRED + SUBJECT_OPTIONAL
    for index, item in enumerate(raw):
        entry = _require_mapping(path, f"subjects[{index}]", item)
        where = f"subjects[{index}]"
        _check_unknown_fields(path, where, entry, allowed)
        for field in SUBJECT_REQUIRED:
            if field not in entry:
                raise CatalogError(f"{path}: {where}: missing required field '{field}'")
        subject_id = _check_slug(
            path, where, "id", _require_str(path, where, "id", entry["id"])
        )
        if subject_id in seen:
            raise CatalogError(f"{path}: {where}: duplicate subject id {subject_id!r}")
        seen.add(subject_id)
        title = _require_str(path, where, "title", entry["title"])
        order = _require_int(
            path, where, "order", entry.get("order", index + 1), minimum=1
        )
        subjects.append(Subject(id=subject_id, title=title, order=order))
    if not subjects:
        raise CatalogError(f"{path}: subjects: at least one subject is required")
    return tuple(subjects)


def _load_groups(
    path: Path, raw: list[Any], subjects: tuple[Subject, ...]
) -> tuple[Group, ...]:
    subject_ids = {subject.id for subject in subjects}
    groups: list[Group] = []
    seen: set[str] = set()
    allowed = GROUP_REQUIRED + GROUP_OPTIONAL
    for index, item in enumerate(raw):
        entry = _require_mapping(path, f"groups[{index}]", item)
        where = f"groups[{index}]"
        _check_unknown_fields(path, where, entry, allowed)
        for field in GROUP_REQUIRED:
            if field not in entry:
                raise CatalogError(f"{path}: {where}: missing required field '{field}'")
        group_id = _check_slug(
            path, where, "id", _require_str(path, where, "id", entry["id"])
        )
        if group_id in seen:
            raise CatalogError(f"{path}: {where}: duplicate group id {group_id!r}")
        seen.add(group_id)
        title = _require_str(path, where, "title", entry["title"])
        subject = _require_str(path, where, "subject", entry["subject"])
        if subject not in subject_ids:
            raise CatalogError(
                f"{path}: {where}: field 'subject' refers to unknown subject "
                f"{subject!r} (known: {', '.join(sorted(subject_ids))})"
            )
        order = _require_int(path, where, "order", entry.get("order", index + 1), minimum=1)
        groups.append(Group(id=group_id, title=title, subject=subject, order=order))
    return tuple(groups)


def _load_guides(
    path: Path,
    raw: list[Any],
    subjects: tuple[Subject, ...],
    groups: tuple[Group, ...] = (),
) -> tuple[GuideEntry, ...]:
    subject_ids = {subject.id for subject in subjects}
    groups_by_id = {group.id: group for group in groups}
    guides: list[GuideEntry] = []
    seen: set[str] = set()
    allowed = GUIDE_REQUIRED + GUIDE_OPTIONAL
    for index, item in enumerate(raw):
        entry = _require_mapping(path, f"guides[{index}]", item)
        guide_id_hint = entry.get("id")
        where = f"guides[{index}]"
        if isinstance(guide_id_hint, str) and guide_id_hint:
            where = f"guides[{index}] (id={guide_id_hint})"
        _check_unknown_fields(path, where, entry, allowed)
        for field in GUIDE_REQUIRED:
            if field not in entry:
                raise CatalogError(f"{path}: {where}: missing required field '{field}'")
        guide_id = _check_slug(
            path, where, "id", _require_str(path, where, "id", entry["id"])
        )
        if guide_id in seen:
            raise CatalogError(f"{path}: {where}: duplicate guide id {guide_id!r}")
        seen.add(guide_id)
        title = _require_str(path, where, "title", entry["title"])
        subject = _require_str(path, where, "subject", entry["subject"])
        if subject not in subject_ids:
            raise CatalogError(
                f"{path}: {where}: field 'subject' refers to unknown subject "
                f"{subject!r} (known: {', '.join(sorted(subject_ids))})"
            )
        guide_type = _require_str(path, where, "type", entry["type"])
        if guide_type not in GUIDE_TYPES:
            raise CatalogError(
                f"{path}: {where}: field 'type' must be one of "
                f"{', '.join(GUIDE_TYPES)}, got {guide_type!r}"
            )
        split = _require_int(
            path, where, "split", entry["split"], minimum=MIN_SPLIT, maximum=MAX_SPLIT
        )
        expected_chapters = _require_int(
            path, where, "expected_chapters", entry["expected_chapters"], minimum=1
        )
        order = _require_int(path, where, "order", entry.get("order", index + 1), minimum=1)
        group = entry.get("group")
        if group is not None:
            group = _require_str(path, where, "group", group)
            if group not in groups_by_id:
                raise CatalogError(
                    f"{path}: {where}: field 'group' refers to unknown group {group!r} "
                    f"(known: {', '.join(sorted(groups_by_id)) or 'none'})"
                )
            if groups_by_id[group].subject != subject:
                raise CatalogError(
                    f"{path}: {where}: field 'group' is {group!r}, which belongs to subject "
                    f"{groups_by_id[group].subject!r}, but the guide is in {subject!r}"
                )
        published = _require_bool(
            path, where, "published", entry.get("published", True)
        )
        updated = entry.get("updated")
        if isinstance(updated, datetime):
            updated = updated.date().isoformat()
        elif isinstance(updated, date):
            updated = updated.isoformat()
        if updated is not None and not isinstance(updated, str):
            raise CatalogError(
                f"{path}: {where}: field 'updated' must be a YYYY-MM-DD string, got {updated!r}"
            )
        guides.append(
            GuideEntry(
                id=guide_id,
                title=title,
                subject=subject,
                type=guide_type,
                split=split,
                expected_chapters=expected_chapters,
                order=order,
                published=published,
                updated=updated,
                group=group,
            )
        )
    if not guides:
        raise CatalogError(f"{path}: guides: at least one guide is required")
    return tuple(guides)


def load(path: str | Path) -> Catalog:
    """Load and validate `catalog.yaml`. Raises `CatalogError` with the path inside."""
    catalog_path = Path(path)
    if not catalog_path.is_file():
        raise CatalogError(f"{catalog_path}: catalog file not found")
    try:
        raw = yaml.safe_load(catalog_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:  # pragma: no cover - message only
        raise CatalogError(f"{catalog_path}: invalid YAML: {exc}") from exc
    data = _require_mapping(catalog_path, "top level", raw)
    version = _require_int(catalog_path, "top level", "version", data.get("version"), minimum=1)
    if version != 1:
        raise CatalogError(f"{catalog_path}: field 'version' must be 1, got {version}")
    subjects = _load_subjects(catalog_path, _require_list(catalog_path, "subjects", data.get("subjects")))
    raw_groups = data.get("groups", [])
    groups = _load_groups(catalog_path, _require_list(catalog_path, "groups", raw_groups), subjects)
    guides = _load_guides(
        catalog_path, _require_list(catalog_path, "guides", data.get("guides")), subjects, groups
    )
    return Catalog(
        version=version, path=catalog_path, subjects=subjects, guides=guides, groups=groups
    )


def load_sources(path: str | Path) -> dict[str, tuple[Path, ...]]:
    """Load `sources.local.yaml` into ``{guide_id: (absolute paths...)}``.

    A guide may be composed of more than one markdown file: the value is then a
    list, read in order and concatenated by `pipeline.ingest` (a theory guide
    followed by its question bank, for instance). A single string stays the
    common case and yields a one-item tuple.
    """
    sources_path = Path(path)
    if not sources_path.is_file():
        raise CatalogError(
            f"{sources_path}: sources file not found "
            "(create it from catalog.yaml guide ids and absolute source paths)"
        )
    try:
        raw = yaml.safe_load(sources_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:  # pragma: no cover - message only
        raise CatalogError(f"{sources_path}: invalid YAML: {exc}") from exc
    data = _require_mapping(sources_path, "top level", raw)
    guides = _require_mapping(sources_path, "guides", data.get("guides"))
    sources: dict[str, tuple[Path, ...]] = {}
    for guide_id, value in guides.items():
        where = f"guides.{guide_id}"
        key = _check_slug(sources_path, where, "guide id", str(guide_id))
        values = value if isinstance(value, list) else [value]
        if not values:
            raise CatalogError(f"{sources_path}: {where}: expected at least one source path")
        paths: list[Path] = []
        for item in values:
            if not isinstance(item, str) or not item.strip():
                raise CatalogError(
                    f"{sources_path}: {where}: expected a path string, got {item!r}"
                )
            source = Path(item).expanduser()
            if not source.is_absolute():
                raise CatalogError(
                    f"{sources_path}: {where}: expected an absolute source path, got {item!r}"
                )
            paths.append(source)
        sources[key] = tuple(paths)
    return sources
