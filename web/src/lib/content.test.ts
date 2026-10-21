import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  chapterPath,
  ContentError,
  chapterUnitIds,
  fetchChapter,
  fetchGuide,
  guidePath,
  guideUnitIds,
  resetContentCache,
  type ChapterJson,
} from "./content"

const CHAPTER: ChapterJson = {
  id: "01-o-aluminio-como-metal-de-engenharia",
  guideId: "aluminio",
  number: 1,
  title: "O alumínio como metal de engenharia",
  slug: "01-o-aluminio-como-metal-de-engenharia",
  kind: "teoria",
  part: null,
  markdown: "## 1. O alumínio como metal de engenharia\n\nTexto.",
  sections: [
    { id: "11-obtencao", title: "1.1 Obtenção", level: 3, parentId: null },
    { id: "12-propriedades", title: "1.2 Propriedades", level: 3, parentId: null },
  ],
  images: [],
}

function stubFetch(payloads: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input)
    const body = payloads[path]
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => body }
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("content loader", () => {
  beforeEach(() => {
    resetContentCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetContentCache()
  })

  it("builds the documented paths", () => {
    expect(guidePath("aluminio")).toBe("/content/guides/aluminio/guide.json")
    expect(chapterPath("aluminio", "04-x")).toBe(
      "/content/guides/aluminio/chapters/04-x.json",
    )
  })

  it("loads a chapter and keeps its sections and image manifest", async () => {
    stubFetch({ [chapterPath("aluminio", CHAPTER.slug)]: CHAPTER })

    const chapter = await fetchChapter("aluminio", CHAPTER.slug)

    expect(chapter.title).toBe("O alumínio como metal de engenharia")
    expect(chapter.sections).toHaveLength(2)
    expect(chapter.images).toEqual([])
  })

  it("rejects a payload without markdown, naming the path", async () => {
    stubFetch({ [chapterPath("dsa", "01-x")]: { id: "01-x", title: "X" } })

    await expect(fetchChapter("dsa", "01-x")).rejects.toBeInstanceOf(ContentError)
    await expect(fetchChapter("dsa", "01-x")).rejects.toThrow(
      "/content/guides/dsa/chapters/01-x.json",
    )
  })

  it("reports a missing guide with the HTTP status", async () => {
    stubFetch({})

    await expect(fetchGuide("nao-existe")).rejects.toThrow(/404/)
  })

  it("builds section-level unit ids, or the chapter itself when it has none", () => {
    expect(chapterUnitIds("aluminio", CHAPTER)).toEqual([
      "aluminio/01-o-aluminio-como-metal-de-engenharia/11-obtencao",
      "aluminio/01-o-aluminio-como-metal-de-engenharia/12-propriedades",
    ])

    expect(chapterUnitIds("aluminio", { ...CHAPTER, sections: [] })).toEqual([
      "aluminio/01-o-aluminio-como-metal-de-engenharia",
    ])
  })

  it("flattens a guide to every chapter unit", () => {
    const guide = {
      chapters: [
        CHAPTER,
        { ...CHAPTER, slug: "02-outro", sections: [] },
      ],
    }

    expect(guideUnitIds("aluminio", guide)).toHaveLength(3)
  })
})
