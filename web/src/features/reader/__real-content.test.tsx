import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MarkdownRenderer } from "./MarkdownRenderer"
import { prepareChapterBody } from "./leading-heading"
import type { ChapterJson } from "@/lib/content"

const ROOT = path.resolve(__dirname, "../../../../content/guides")

function load(guideId: string, slug: string): ChapterJson {
  const raw = readFileSync(path.join(ROOT, guideId, "chapters", `${slug}.json`), "utf8")
  return JSON.parse(raw) as ChapterJson
}

function renderChapter(guideId: string, slug: string) {
  const chapter = load(guideId, slug)
  const prepared = prepareChapterBody(chapter.markdown, chapter.title, chapter.sections)

  const view = render(
    <MemoryRouter>
      <MarkdownRenderer
        chapterSlug={chapter.slug}
        guideId={guideId}
        images={chapter.images}
        markdown={prepared.markdown}
        sections={prepared.sections}
      />
    </MemoryRouter>,
  )

  return { chapter, prepared, container: view.container }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ count: 0, guideId: "aluminio", units: {} }),
      text: async () => "{}",
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function assertHierarchy(container: HTMLElement) {
  const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
    Number(heading.tagName.slice(1)),
  )
  // A chapter with no sections of its own (banco, questão) is prose only.
  if (levels.length > 0) expect(levels[0]).toBe(2)
  for (let index = 1; index < levels.length; index += 1) {
    expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
  }
  expect(container.querySelector("h1")).toBeNull()
}

function assertAnchors(container: HTMLElement, prepared: ReturnType<typeof prepareChapterBody>) {
  for (const section of prepared.sections) {
    const found = container.querySelector(`#${globalThis.CSS.escape(section.id)}`)
    if (found === null) {
      const seen = Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(
        (el) => `${el.tagName}:${el.id || "(no id)"}:${(el.textContent ?? "").slice(0, 60)}`,
      )
      throw new Error(
        `missing anchor for section ${section.level} ${section.id} :: ${section.title}\nheadings: ${seen.join(" || ")}`,
      )
    }
  }
}

describe("real content smoke", () => {
  it("renders alumínio chapter 4 with math, tables and figures", () => {
    const { container, prepared } = renderChapter("aluminio", "04-tratamentos-termicos-do-aluminio")

    assertHierarchy(container)
    assertAnchors(container, prepared)
    expect(container.querySelectorAll('[data-slot="table-region"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll("figure img").length).toBeGreaterThan(0)
    expect(container.querySelectorAll('figure img[loading="lazy"]').length).toBe(
      container.querySelectorAll("figure img").length,
    )
    expect(container.innerHTML).not.toContain("<script")
  })

  it("renders math through KaTeX on a chapter that has formulas", () => {
    const { container } = renderChapter("aluminio", "01-o-aluminio-como-metal-de-engenharia")

    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-slot="math-display"]').length).toBeGreaterThan(0)
  })

  it("renders a llm-l0l1 chapter with deep headings and code", () => {
    const { container, prepared } = renderChapter(
      "llm-l0l1",
      "12-f1-7-decision-models-system-1-typed-decisions-no-text-generation",
    )

    assertHierarchy(container)
    assertAnchors(container, prepared)
    expect(container.querySelector("pre code")).not.toBeNull()
    expect(container.querySelectorAll('[data-slot="chapter-heading"]').length).toBeGreaterThan(3)
  })

  it("renders the dsa split-1 chapter without a duplicate title", () => {
    const { container, prepared } = renderChapter("dsa", "01-restate-and-decompose")

    assertHierarchy(container)
    assertAnchors(container, prepared)
    expect(container.textContent).not.toMatch(/Chapter 1: Restate and decompose/i)
  })

  it("renders every published chapter without throwing", { timeout: 120_000 }, () => {
    const guides = ["aluminio", "titanio", "magnesio", "dsa", "llm-l0l1"]
    let rendered = 0

    for (const guideId of guides) {
      const dir = path.join(ROOT, guideId, "chapters")
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".json")) continue
        const { container, prepared } = renderChapter(guideId, file.replace(/\.json$/, ""))
        assertHierarchy(container)
        assertAnchors(container, prepared)
        for (const figure of container.querySelectorAll("figure img")) {
          expect(figure.getAttribute("loading")).toBe("lazy")
        }
        for (const region of container.querySelectorAll('[data-slot="table-region"]')) {
          expect(region.getAttribute("aria-label")).toMatch(/tabela/i)
          expect(region.querySelectorAll("th[scope=col]").length).toBeGreaterThan(0)
        }
        rendered += 1
      }
    }

    // Floor reflects the current published corpus for these five guides
    // (titanio restructured from 39 to 16 chapters).
    expect(rendered).toBeGreaterThanOrEqual(70)
  })
})
