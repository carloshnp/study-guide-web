# Briefing for implementation agents, Estudos

Read this whole file before touching anything. It is the shared contract for every phase.
The authoritative documents are `SPEC.md`, `design-system/estudos/MASTER.md`, `tasks/plan.md`,
`tasks/todo.md`. This file only restates what agents get wrong.

## Environment (already installed, do not reinstall)

- Project root: `/home/carloshnp/study-site`. Python venv: `.venv` (fastapi, pyyaml, pillow, pytest, httpx).
- Frontend: `web/` (Vite 8, React 19, TS 6 strict, Tailwind v4, coss/ui copied into
  `web/src/components/ui`, `@/*` alias to `web/src`, Vitest + Testing Library configured with
  `web/src/test/setup.ts`, Playwright installed as a package).
- Backend entry: `app/main.py` (health route plus static mounts; SPA fallback).
- No git commits: the orchestrator commits. No `git checkout`, no history rewriting.
- Never start a long-lived server. Use `fastapi.testclient.TestClient`, `vite build`,
  `vitest run`, and `curl` only against a server you started for that check and killed.

Commands:

```bash
cd /home/carloshnp/study-site
.venv/bin/pytest -q
.venv/bin/python -m pipeline.build --all
cd web && npm run test && npm run typecheck && npm run build
```

## Hard rules

1. TDD per task: a failing test at the listed seam first, minimal implementation, then the next.
2. Touching only the files your task list names. Other agents are editing other directories in
   parallel; a cross-directory edit will be reverted.
3. No raw HTML blobs in `.tsx`, no `dangerouslySetInnerHTML`. Every markdown node type gets a
   component. Use coss/ui primitives from `web/src/components/ui`; do not install shadcn defaults.
4. Tokens from `design-system/estudos/MASTER.md` only; no raw hex in components.
5. Python: type hints, dataclasses for contracts, raise with the offending path in the message.
6. If something cannot be done as specified, stop and report the blocker with the exact command
   output. Never fake a passing test or a fabricated file.

## Content pipeline contract

`catalog.yaml` (public) lists what is published; `sources.local.yaml` (gitignored) maps id to the
absolute source path. Shape:

```yaml
version: 1
subjects:
  - {id: metalurgia, title: Metalurgia, order: 1}
groups:                     # subfolders inside a subject; optional
  - {id: nao-ferrosos, title: Não-Ferrosos, subject: metalurgia, order: 1}
guides:
  - id: aluminio
    title: Alumínio
    subject: metalurgia
    group: nao-ferrosos     # optional; omit to sit directly under the subject
    type: teoria            # teoria | banco | referencia | glossario | apendice
    split: 2                # heading level that starts a chapter
    expected_chapters: 29
    order: 1
    published: true
```

`sources.local.yaml` maps each id to one file, or to a list of files when the guide is a
composition (theory followed by its question bank). A list is concatenated in order with one
blank line between parts, and every file is recorded in the guide's `meta.json` under
`sources`, so drift is reported per part:

```yaml
guides:
  aluminio: "/run/media/carloshnp/D/Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_aluminio/aluminio-final.md"
  cn-taylor:
    - "/run/media/carloshnp/D/Obsidian/.../Guias/calculo-numerico-modulo1-taylor.md"
    - "/run/media/carloshnp/D/Obsidian/.../Guias/calculo-numerico-modulo1-taylor-questoes.md"
```

Generated output (gitignored), exact shapes:

`content/index.json`

```json
{
  "generatedAt": "2026-10-21T02:00:00Z",
  "subjects": [{"id": "metalurgia", "title": "Metalurgia", "order": 1}],
  "guides": [{
    "id": "aluminio", "title": "Alumínio", "subject": "metalurgia", "type": "teoria",
    "chapterCount": 29, "updatedAt": "2026-10-21T02:00:00Z",
    "cover": "/media/covers/aluminio.webp"
  }]
}
```

`content/guides/<id>/guide.json`

```json
{
  "id": "aluminio", "title": "Alumínio", "subject": "metalurgia", "type": "teoria",
  "meta": {"discipline": "EET 428", "professor": "Luiz Henrique de Almeida", "sources": ["..."]},
  "cover": {"markdown": "# Alumínio\n\n> guia ...\n"},
  "chapters": [{
    "id": "01-o-aluminio-como-metal-de-engenharia",
    "number": 1,
    "title": "O alumínio como metal de engenharia",
    "slug": "01-o-aluminio-como-metal-de-engenharia",
    "part": null,
    "sections": [{"id": "11-obtencao-e-viabilidade-comercial", "title": "1.1 Obtenção e viabilidade comercial", "level": 3, "parentId": null}]
  }]
}
```

`content/guides/<id>/chapters/<slug>.json`

```json
{
  "id": "01-o-aluminio-como-metal-de-engenharia", "guideId": "aluminio", "number": 1,
  "title": "O alumínio como metal de engenharia",
  "markdown": "## 1. O alumínio...\n\nTexto com ![alt](/media/<sha>/1280.webp)...",
  "sections": [{"id": "...", "title": "...", "level": 3, "parentId": null}],
  "images": [{"src": "/media/<sha>/1280.webp", "srcset": "/media/<sha>/640.webp 640w, /media/<sha>/1280.webp 1280w", "width": 1280, "height": 720, "alt": "...", "original": "/media/<sha>/original.png"}]
}
```

`content/search.json`: array of `{"id": "aluminio/01-...", "guideId": "aluminio", "guideTitle": "Alumínio", "chapterId": "01-...", "title": "...", "headings": ["..."], "text": "..."}`.

Progress unit id: `<guideId>/<chapterSlug>/<sectionId>`; chapter id itself is a unit when the
chapter has no sections. States: `done`, `review`, or absent.

## Guide sources, split levels, expected chapters

| id | source (under `/run/media/carloshnp/D/`) | split | chapters |
|:---|:---|:---|:---|
| aluminio | `Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_aluminio/aluminio-final.md` | 2 | 29 |
| titanio | `Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_titanio/titanio-final.md` | 2 | 39 |
| magnesio | `Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_magnesio/outputs/magnesio-final.md` | 2 | 16 |
| dsa | `Programming/DSA/guide/outputs/dsa-guide.md` | 1 | 12 |
| llm-l0l1 | `Programming/llm_chess/study-guide/outputs/foundations-l0l1-guide.md` | 2 | 14 |

Measured facts: images use `assets/...`, `../assets/...`, `../diagrams/...` and all resolve
relative to the source file. `#` inside fenced code is common (llm_chess). Front matter blocks are
`Índice`, `How to use this guide`, `Contents`, `Conventions`, `A0 About this appendix`; they belong
to the guide cover, not to chapters. magnésio has H4 headings; treat H2/H3/H4 as progress units.

## UI direction

From `design-system/estudos/MASTER.md`: Montserrat self-hosted (fonts already copied to
`web/public/fonts/`), accent `#1d4ed8`, hairline borders, 14px cards, uppercase kickers, no serif,
no per-subject colors, 44px touch targets, visible focus, both themes, reduced motion honored.
