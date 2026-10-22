"""Cloze syntax: ``{{c1::answer}}`` / ``{{c1::answer::hint}}``.

One lacuna (distinct ``cN`` number) produces one card. Rendering hides only the
target lacuna in the question and fills every lacuna in the answer, which is what
the review screen shows after a rating. Malformed markers are rejected instead of
being silently ignored, so a typo cannot create a broken card.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

#: ``{{c<number>::<answer>}}`` or ``{{c<number>::<answer>::<hint>}}``.
CLOZE_PATTERN = re.compile(r"\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}", re.DOTALL)
_OPEN_MARKER = "{{c"
HIDDEN = "[...]"


class ClozeSyntaxError(ValueError):
    """Raised for a malformed or empty cloze marker."""


@dataclass(frozen=True)
class Gap:
    """One lacuna: its number, the hidden answer and an optional hint."""

    number: int
    answer: str
    hint: str | None = None


def _clean(value: str) -> str:
    return value.strip()


def parse_cloze(text: str) -> list[Gap]:
    """Return one :class:`Gap` per distinct lacuna number, in order of appearance."""
    if not text:
        return []
    gaps: dict[int, Gap] = {}
    residue = text
    for match in CLOZE_PATTERN.finditer(text):
        number = int(match.group(1))
        answer = _clean(match.group(2) or "")
        if not answer:
            raise ClozeSyntaxError(f"lacuna c{number} has an empty answer")
        hint = _clean(match.group(3) or "") or None
        residue = residue.replace(match.group(0), "", 1)
        gaps.setdefault(number, Gap(number=number, answer=answer, hint=hint))
    if _OPEN_MARKER in residue:
        raise ClozeSyntaxError("malformed cloze marker: use {{c1::answer}}")
    return list(gaps.values())


def cloze_numbers(text: str) -> list[int]:
    """Distinct lacuna numbers in ascending order (card creation order)."""
    return sorted({gap.number for gap in parse_cloze(text)})


def has_gaps(text: str) -> bool:
    """True when the text carries at least one well-formed lacuna."""
    try:
        return bool(parse_cloze(text))
    except ClozeSyntaxError:
        return False


def card_templates(kind: str, front: str) -> list[str]:
    """Card templates a note of ``kind`` must have (one card per template)."""
    if kind == "basic":
        return ["basic"]
    if kind == "basic-reverse":
        return ["basic", "reverse"]
    if kind == "cloze":
        return [f"cloze:c{number}" for number in cloze_numbers(front)]
    raise ValueError(f"unknown note kind {kind!r}")


def render(text: str, hidden_number: int | None = None) -> str:
    """Render ``text``, hiding ``hidden_number`` and filling every other lacuna."""

    def replace(match: re.Match[str]) -> str:
        number = int(match.group(1))
        if number != hidden_number:
            return _clean(match.group(2) or "")
        hint = _clean(match.group(3) or "")
        return f"[{hint}]" if hint else HIDDEN

    return CLOZE_PATTERN.sub(replace, text)


def render_question(text: str, number: int) -> str:
    """The card prompt: only lacuna ``number`` is hidden."""
    return render(text, hidden_number=number)


def render_answer(text: str, number: int | None = None) -> str:
    """The revealed card: every lacuna filled in."""
    return render(text, hidden_number=None)


def parse_template(template: str) -> int | None:
    """The lacuna number of a ``cloze:cN`` template, or ``None`` for other templates."""
    if not template.startswith("cloze:c"):
        return None
    try:
        return int(template.split(":", 1)[1][1:])
    except (IndexError, ValueError):
        return None
