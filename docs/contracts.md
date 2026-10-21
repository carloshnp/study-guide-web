# Generated content contract

`pipeline.build --all` writes everything under `content/` (gitignored). The SPA
reads only these files. `tests/pipeline/test_contract.py` pins the key sets
below, so a change here is a contract change.

## Files

```
content/
  index.json
  search.json
  guides/<guideId>/guide.json
  guides/<guideId>/chapters/<slug>.json
  media/<sha256>/640.webp
  media/<sha256>/1280.webp
  media/<sha256>/original.<ext>
  media/covers/<guideId>.webp
```

`<slug>` equals the chapter `id`, e.g. `01-o-aluminio-como-metal-de-engenharia`.
`<sha256>` is the hash of the source image file, so the same figure is stored
once no matter how many chapters embed it.

## `index.json`

Keys: `generatedAt`, `subjects`, `guides`.

```json
{
  "generatedAt": "2026-10-21T05:41:59Z",
  "subjects": [{"id": "metalurgia", "title": "Metalurgia", "order": 1}],
  "guides": [{
    "id": "aluminio", "title": "Alumínio", "subject": "metalurgia", "type": "teoria",
    "chapterCount": 29, "updatedAt": "2026-10-21T00:00:00Z",
    "cover": "/media/covers/aluminio.webp"
  }]
}
```

`cover` is `null` when the guide has no figure (DSA): the UI shows its
typographic placeholder instead. Covers are 1280x720 webp, a 16:9 centre crop
of the guide's first figure.

## `guides/<id>/guide.json`

Keys: `id`, `title`, `subject`, `type`, `meta`, `cover`, `chapters`.

* `meta`: `discipline`, `professor`, `sources` (file names parsed from the cover
  blockquote), `generated`; each is `null`/`[]` when the source does not say.
* `cover.markdown`: the guide's own front matter blocks (`Índice`, `Table of
  contents`, `How to use this guide`, `Conventions`) with image links already
  rewritten to `/media/...`.
* `chapters[]`: `id`, `number`, `title`, `slug`, `part`, `kind`, `sections[]`.
* `sections[]`: `id`, `title`, `level`, `parentId` — flat, document order,
  nested up to h4 through `parentId`.

## `guides/<id>/chapters/<slug>.json`

Keys: `id`, `guideId`, `number`, `title`, `slug`, `kind`, `part`, `markdown`,
`sections`, `images`.

* `markdown` is the chapter verbatim, its own heading included (`## 1. …` for
  split-2 guides, `# Chapter 1 …` for split-1 guides, `# Banco de questões …`
  for a promoted appendix). Image links are absolute `/media/...`.
* `images[]`: `src`, `srcset`, `width`, `height` (of the 1280 variant), `alt`,
  `original`. `srcset` is `640w, 1280w`; `original` is the untouched file for
  the lightbox link.
* `kind` is one of `teoria`, `banco`, `referencia`, `glossario`, `apendice`.
  Headings above the split level that appear after the guide started its
  chapters (`# Banco de questões resolvidas`, `# Referência rápida`,
  `# Glossário` in magnésio) become chapters of their own with that kind; their
  h2/h3/h4 headings become their sections. `part` names the part divider the
  chapter sits under (`Part I: L0 Toolkit` in llm-l0l1), else `null`.

## `search.json`

Array, one document per chapter, keys `id` (`<guideId>/<chapterSlug>`),
`guideId`, `guideTitle`, `chapterId`, `title`, `headings`, `text`. `text` is the
chapter body with markdown, code fences, link URLs and math `$` delimiters
removed; accents are kept, so the client index must fold them at query time.

## Progress units

A unit id is `<guideId>/<chapterSlug>/<sectionId>`, and the chapter id itself is
the unit when a chapter has no sections (`<guideId>/<chapterSlug>`). Section ids
are stable ASCII slugs, unique inside their chapter.

## Checks

* `python -m pipeline.build --all` refuses to write when the measured chapter
  count differs from `catalog.yaml` `expected_chapters`.
* `python -m pipeline.check_links` exits 1 if any `/media/...` reference in the
  JSON (chapter markdown, manifest `src`/`srcset`/`original`, cover markdown,
  covers in `index.json`) does not resolve to a file in `content/media`.
