"""Per-section images: the pictures the "imagem fixa" reading view pins.

A guide folder may carry ``section-images.json`` next to ``guide.md``. It links a
section of a chapter to one or more generated pictures, so the markdown itself
stays clean and the classic reading view is unchanged::

    {
      "schemaVersion": 1,
      "chapters": {
        "03-elementos-intersticiais-e-o-ti-comercialmente-puro": {
          "31-por-que-centesimos-de-porcento-ja-mudam-a-dureza": [
            {"file": "assets/secoes/ch03-s01.jpg", "alt": "…", "plan": "ch03-s01"}
          ]
        }
      }
    }

``chapters`` is keyed by chapter slug and then by section id (the ids that
``guide.json`` lists). A section may list several images; the reader shows
buttons to step through them. The build resolves each ``file`` against the guide
folder, writes the usual webp variants (plus a 1920 one) into the media cache
and emits the manifest as ``sectionImages`` in the chapter JSON.

The build refuses a sidecar that points at a chapter, a section or a file that
does not exist: a picture silently pinned to nothing is worse than a failed
build.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from PIL import Image as PILImage

from pipeline.assets import DEFAULT_WIDTH, SECTION_WIDTHS, AssetError, image_ref

SIDECAR_NAME = "section-images.json"
SCHEMA_VERSION = 1


class SectionImagesError(RuntimeError):
    """Raised when the sidecar is malformed or points at something missing."""


@dataclass(frozen=True)
class SectionImageSpec:
    """One entry of the sidecar, before the file is resolved."""

    file: str
    alt: str
    plan: str | None = None


# chapter slug -> section id -> images, in the order the reader steps through them
SectionImageIndex = dict[str, dict[str, list[SectionImageSpec]]]


def _fail(path: Path, detail: str) -> SectionImagesError:
    return SectionImagesError(f"{path}: {detail}")


def _spec(path: Path, where: str, raw: Any) -> SectionImageSpec:
    if not isinstance(raw, dict):
        raise _fail(path, f"{where}: an image entry must be an object")
    file = raw.get("file")
    alt = raw.get("alt")
    plan = raw.get("plan")
    if not isinstance(file, str) or not file.strip():
        raise _fail(path, f'{where}: "file" must be a non-empty string')
    if not isinstance(alt, str) or not alt.strip():
        raise _fail(path, f'{where}: "alt" must be a non-empty string')
    if plan is not None and not isinstance(plan, str):
        raise _fail(path, f'{where}: "plan" must be a string when present')
    return SectionImageSpec(file=file.strip(), alt=alt.strip(), plan=plan)


def load_section_images(guide_dir: Path) -> SectionImageIndex:
    """Read ``section-images.json``; a guide without one has no section images."""
    path = guide_dir / SIDECAR_NAME
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise _fail(path, f"invalid JSON: {exc}") from exc
    if not isinstance(payload, dict) or payload.get("schemaVersion") != SCHEMA_VERSION:
        raise _fail(path, f"schemaVersion must be {SCHEMA_VERSION}")
    chapters = payload.get("chapters")
    if not isinstance(chapters, dict):
        raise _fail(path, '"chapters" must be an object keyed by chapter slug')

    index: SectionImageIndex = {}
    for slug, sections in chapters.items():
        if not isinstance(sections, dict):
            raise _fail(path, f"{slug}: must map section ids to image lists")
        per_section: dict[str, list[SectionImageSpec]] = {}
        for section_id, entries in sections.items():
            where = f"{slug}/{section_id}"
            if not isinstance(entries, list) or not entries:
                raise _fail(path, f"{where}: needs a non-empty list of images")
            per_section[section_id] = [
                _spec(path, f"{where}[{position}]", entry)
                for position, entry in enumerate(entries)
            ]
        index[slug] = per_section
    return index


def check_known_chapters(
    index: SectionImageIndex, guide_dir: Path, chapter_slugs: Iterable[str]
) -> None:
    """Reject a sidecar chapter that the guide does not have."""
    known = set(chapter_slugs)
    for slug in index:
        if slug not in known:
            raise _fail(guide_dir / SIDECAR_NAME, f"unknown chapter {slug!r}")


def _widths_for(source: Path) -> tuple[int, ...]:
    with PILImage.open(source) as image:
        wide_enough = max(image.width, DEFAULT_WIDTH)
    return tuple(width for width in SECTION_WIDTHS if width <= wide_enough)


def resolve_chapter(
    specs: dict[str, list[SectionImageSpec]] | None,
    *,
    chapter_slug: str,
    section_ids: Iterable[str],
    guide_dir: Path,
    media_root: Path,
) -> dict[str, list[dict[str, object]]]:
    """Build the ``sectionImages`` payload of one chapter.

    Keys keep the order of ``section_ids`` (document order) so the JSON is
    stable between builds.
    """
    if not specs:
        return {}
    sidecar = guide_dir / SIDECAR_NAME
    ordered = list(section_ids)
    unknown = [section_id for section_id in specs if section_id not in set(ordered)]
    if unknown:
        raise _fail(sidecar, f"{chapter_slug}: unknown section id {unknown[0]!r}")

    payload: dict[str, list[dict[str, object]]] = {}
    for section_id in ordered:
        entries = specs.get(section_id)
        if not entries:
            continue
        refs: list[dict[str, object]] = []
        for entry in entries:
            # Lexical check: "..", or an absolute path, must not leave the guide
            # folder; a symlink the guide folder itself contains is its own business.
            source = Path(os.path.normpath(guide_dir / entry.file))
            try:
                source.relative_to(os.path.normpath(guide_dir))
            except ValueError as exc:
                raise _fail(sidecar, f"{chapter_slug}/{section_id}: {entry.file!r} leaves the guide folder") from exc
            if not source.is_file():
                raise _fail(sidecar, f"{chapter_slug}/{section_id}: {entry.file!r}: image file not found")
            try:
                ref = image_ref(
                    source, media_root, entry.alt, widths=_widths_for(source)
                )
            except (AssetError, OSError) as exc:
                raise _fail(sidecar, f"{chapter_slug}/{section_id}: {exc}") from exc
            refs.append(ref.as_json())
        payload[section_id] = refs
    return payload
