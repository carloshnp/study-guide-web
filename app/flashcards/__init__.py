"""Flashcards feature: scheduler, queue, decks and cloze parsing.

The scheduler is a transparent SRS core with per-card states (difficulty D,
stability S, retrievability R) and desired-retention-derived intervals. It is
inspired by the FSRS state model but uses simple growth constants for v1; the
interface is what a later FSRS port would implement. See
``docs/spec-flashcards.md`` for the product requirements.
"""
