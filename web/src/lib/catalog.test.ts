import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CatalogError,
  catalogErrorMessage,
  contentGuidePath,
  filterGuidesBySubject,
  foldText,
  fuzzyMatch,
  groupGuidesBySubject,
  guideTrail,
  GUIDE_KIND_LABELS,
  loadCatalog,
  loadCatalogIndex,
  loadGuide,
  matchesSubject,
  resetCatalogCache,
  unitIdsOfGuide,
  type CatalogIndex,
  type Guide,
} from "@/lib/catalog"

const index: CatalogIndex = {
  generatedAt: "2026-10-21T00:00:00Z",
  groups: [
    { id: "nao-ferrosos", order: 1, subject: "metalurgia", title: "Não-Ferrosos" },
  ],
  subjects: [
    { id: "metalurgia", order: 1, title: "Metalurgia" },
    { id: "programacao", order: 2, title: "Programação" },
  ],
  guides: [
    {
      chapterCount: 2,
      cover: "/media/covers/aluminio.webp",
      group: "nao-ferrosos",
      id: "aluminio",
      subject: "metalurgia",
      title: "Alumínio",
      type: "teoria",
      updatedAt: "2026-10-21T00:00:00Z",
    },
    {
      chapterCount: 1,
      cover: "/media/covers/titanio.webp",
      group: "nao-ferrosos",
      id: "titanio",
      subject: "metalurgia",
      title: "Titânio",
      type: "teoria",
      updatedAt: "2026-10-21T00:00:00Z",
    },
    {
      chapterCount: 1,
      cover: null,
      group: null,
      id: "dsa",
      subject: "programacao",
      title: "Estruturas de Dados e Algoritmos",
      type: "teoria",
      updatedAt: "2026-10-21T00:00:00Z",
    },
  ],
}

const aluminio: Guide = {
  chapters: [
    {
      id: "01-o-aluminio",
      kind: "teoria",
      number: 1,
      part: null,
      sections: [
        { id: "11-propriedades", level: 3, parentId: null, title: "1.1 Propriedades" },
        { id: "111-ligas", level: 4, parentId: "11-propriedades", title: "1.1.1 Ligas" },
      ],
      slug: "01-o-aluminio",
      title: "O alumínio",
    },
    {
      id: "02-ligas",
      kind: "teoria",
      number: 2,
      part: null,
      sections: [],
      slug: "02-ligas",
      title: "Ligas",
    },
  ],
  cover: { markdown: "# Alumínio\n" },
  id: "aluminio",
  meta: { discipline: "EET 428", generated: null, professor: null, sources: [] },
  subject: "metalurgia",
  title: "Alumínio",
  type: "teoria",
}

type FetchStub = (input: RequestInfo | URL) => Promise<unknown>

function stubFetch(handler: FetchStub) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(input))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return { json: async () => payload, ok, status }
}

beforeEach(() => {
  resetCatalogCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetCatalogCache()
})

describe("catalog loading", () => {
  it("fetches the index once and reuses the cached promise", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(index))

    const first = await loadCatalogIndex()
    const second = await loadCatalogIndex()

    expect(first.guides).toHaveLength(3)
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("/content/index.json", expect.anything())
  })

  it("fetches every guide manifest once for the whole catalog", async () => {
    const fetchMock = stubFetch(async (input) => {
      const path = String(input)
      if (path === "/content/index.json") return jsonResponse(index)
      const guideId = path.split("/")[3] ?? "aluminio"
      return jsonResponse({ ...aluminio, id: guideId, title: guideId })
    })

    const catalog = await loadCatalog()
    await loadCatalog()

    expect(catalog.guides.map((guide) => guide.id)).toEqual(["aluminio", "titanio", "dsa"])
    const requested = fetchMock.mock.calls.map(([input]) => String(input)).sort()
    expect(requested).toEqual([
      "/content/guides/aluminio/guide.json",
      "/content/guides/dsa/guide.json",
      "/content/guides/titanio/guide.json",
      "/content/index.json",
    ])
  })

  it("reports a missing guide file as a CatalogError naming the path", async () => {
    stubFetch(async () => jsonResponse({ detail: "not found" }, false, 404))

    await expect(loadGuide("aluminio")).rejects.toMatchObject({
      name: "CatalogError",
      path: contentGuidePath("aluminio"),
      status: 404,
    })
    await expect(loadGuide("aluminio")).rejects.toBeInstanceOf(CatalogError)
    await expect(loadGuide("aluminio")).rejects.toThrow(/guide\.json/)
  })

  it("rejects a payload that is not the documented shape", async () => {
    stubFetch(async () => jsonResponse({ generatedAt: null, subjects: [], guides: "nope" }))

    await expect(loadCatalogIndex()).rejects.toMatchObject({ status: 200 })
    await expect(loadCatalogIndex()).rejects.toThrow(/guides/)
  })

  it("wraps a network failure with a message a page can show", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to parse URL")
    })

    const error = await loadCatalogIndex().catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(CatalogError)
    expect(catalogErrorMessage(error)).toMatch(/não foi possível carregar/i)
    expect(catalogErrorMessage(error)).toContain("/content/index.json")
  })

  it("falls back to a generic message for values that are not errors", () => {
    expect(catalogErrorMessage("boom")).toMatch(/catálogo/i)
  })
})

describe("subject grouping", () => {
  it("orders groups by subject order and keeps the index order inside a group", () => {
    const groups = groupGuidesBySubject(index)

    expect(groups.map((group) => group.subject.id)).toEqual(["metalurgia", "programacao"])
    expect(groups[0]?.guides.map((guide) => guide.id)).toEqual(["aluminio", "titanio"])
    expect(groups[1]?.guides.map((guide) => guide.id)).toEqual(["dsa"])
  })

  it("drops guides that point at an unknown subject", () => {
    const groups = groupGuidesBySubject({
      ...index,
      guides: [...index.guides, { ...index.guides[0]!, id: "orfao", subject: "fantasma" }],
    })

    expect(groups.flatMap((group) => group.guides.map((guide) => guide.id))).not.toContain("orfao")
  })

  it("nests the guides of a folder and keeps the rest direct", () => {
    const groups = groupGuidesBySubject({
      ...index,
      guides: [
        ...index.guides,
        {
          chapterCount: 9,
          cover: null,
          group: null,
          id: "magnesio",
          subject: "metalurgia",
          title: "Magnésio",
          type: "teoria",
          updatedAt: null,
        },
      ],
    })

    expect(groups[0]?.folders.map((folder) => folder.group.id)).toEqual(["nao-ferrosos"])
    expect(groups[0]?.folders[0]?.guides.map((guide) => guide.id)).toEqual(["aluminio", "titanio"])
    expect(groups[0]?.direct.map((guide) => guide.id)).toEqual(["magnesio"])
    // `guides` stays the full list of the subject, folder members included.
    expect(groups[0]?.guides.map((guide) => guide.id)).toEqual(["aluminio", "titanio", "magnesio"])
  })

  it("hides a folder that has no guides and keeps a guide whose folder is unknown", () => {
    const groups = groupGuidesBySubject({
      ...index,
      groups: [...index.groups, { id: "vazia", order: 2, subject: "metalurgia", title: "Vazia" }],
      guides: index.guides.map((guide) =>
        guide.id === "aluminio" ? { ...guide, group: "fantasma" } : guide,
      ),
    })

    expect(groups[0]?.folders.map((folder) => folder.group.id)).toEqual(["nao-ferrosos"])
    expect(groups[0]?.folders[0]?.guides.map((guide) => guide.id)).toEqual(["titanio"])
    expect(groups[0]?.direct.map((guide) => guide.id)).toEqual(["aluminio"])
  })

  it("reports the subject and the folder of a guide as its trail", () => {
    expect(guideTrail(index, "aluminio")?.subject.title).toBe("Metalurgia")
    expect(guideTrail(index, "aluminio")?.group?.title).toBe("Não-Ferrosos")
    expect(guideTrail(index, "dsa")?.group).toBeNull()
    expect(guideTrail(index, "inexistente")).toBeNull()
  })

  it("returns no group for a subject without published guides", () => {
    const groups = groupGuidesBySubject({
      ...index,
      subjects: [...index.subjects, { id: "vazio", order: 3, title: "Vazio" }],
    })

    expect(groups.map((group) => group.subject.id)).toEqual(["metalurgia", "programacao"])
  })
})

describe("accent-insensitive subject filter", () => {
  it("folds diacritics and case", () => {
    expect(foldText("Magnésio")).toBe("magnesio")
    expect(foldText("PROGRAMAÇÃO")).toBe("programacao")
  })

  it("matches an accented subject with an unaccented query", () => {
    expect(matchesSubject({ id: "p", order: 1, title: "Programação" }, "programacao")).toBe(true)
    expect(fuzzyMatch("Magnésio", "magnesio")).toBe(true)
  })

  it("accepts prefixes, word subsets and subsequences", () => {
    expect(fuzzyMatch("Metalurgia", "metal")).toBe(true)
    expect(fuzzyMatch("Fundamentos para L0 e L1", "fundamentos l1")).toBe(true)
    expect(fuzzyMatch("Metalurgia", "mtlg")).toBe(true)
  })

  it("rejects a query that shares nothing with the subject", () => {
    expect(fuzzyMatch("Metalurgia", "quimica")).toBe(false)
    expect(matchesSubject({ id: "m", order: 1, title: "Metalurgia" }, "zzz")).toBe(false)
  })

  it("keeps only the groups the query names, and an empty query keeps all", () => {
    expect(filterGuidesBySubject(index, "").map((group) => group.subject.id)).toEqual([
      "metalurgia",
      "programacao",
    ])
    expect(filterGuidesBySubject(index, "programacao").map((group) => group.subject.id)).toEqual([
      "programacao",
    ])
    expect(filterGuidesBySubject(index, "zzz")).toEqual([])
  })

  it("widens a matching group to its guides and narrows on a guide title", () => {
    expect(filterGuidesBySubject(index, "metalurgia")[0]?.guides).toHaveLength(2)
    expect(filterGuidesBySubject(index, "dsa")[0]?.guides.map((guide) => guide.id)).toEqual(["dsa"])
  })

  it("keeps the whole folder when the folder name matches", () => {
    const [group] = filterGuidesBySubject(index, "nao ferrosos")

    expect(group?.folders).toHaveLength(1)
    expect(group?.folders[0]?.guides.map((guide) => guide.id)).toEqual(["aluminio", "titanio"])
    expect(group?.direct).toEqual([])
  })

  it("narrows inside a folder without dropping the folder itself", () => {
    const [group] = filterGuidesBySubject(index, "titanio")

    expect(group?.folders.map((folder) => folder.group.id)).toEqual(["nao-ferrosos"])
    expect(group?.folders[0]?.guides.map((guide) => guide.id)).toEqual(["titanio"])
    expect(group?.guides.map((guide) => guide.id)).toEqual(["titanio"])
  })
})

describe("progress units", () => {
  it("labels every kind the catalog can publish", () => {
    expect(GUIDE_KIND_LABELS).toEqual({
      apendice: "Apêndice",
      banco: "Banco",
      glossario: "Glossário",
      referencia: "Referência",
      teoria: "Teoria",
    })
  })

  it("gives a chapter with sections one unit per heading and no chapter unit", () => {
    expect(unitIdsOfGuide(aluminio)).toEqual([
      "aluminio/01-o-aluminio/11-propriedades",
      "aluminio/01-o-aluminio/111-ligas",
      "aluminio/02-ligas",
    ])
  })

  it("is empty for a guide without chapters", () => {
    expect(unitIdsOfGuide({ ...aluminio, chapters: [] })).toEqual([])
  })
})
