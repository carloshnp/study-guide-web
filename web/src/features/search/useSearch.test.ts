import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { searchFixture as documents } from "./__fixtures__/load-fixture"
import {
  MAX_RECENT_QUERIES,
  RECENT_QUERIES_KEY,
  createSearchIndex,
  excerptFor,
  foldAccents,
  groupHits,
  highlightSegments,
  loadSearchCorpus,
  rememberQuery,
  resetRecentQueriesCache,
  searchChapters,
  useSearch,
  type SearchHit,
} from "./useSearch"

const SOLUCAO_TITLE = "aluminio/04-solucao-solida-e-precipitacao"
const SOLUCAO_BODY = "aluminio/05-tratamentos-termicos-do-aluminio"

const ids = (hits: SearchHit[]): string[] => hits.map((hit) => hit.id)
const positionOf = (hits: SearchHit[], id: string): number => ids(hits).indexOf(id)

describe("foldAccents", () => {
  it("remove diacríticos sem mudar maiúsculas nem espaços", () => {
    expect(foldAccents("Magnésio, Solução sólida")).toBe("Magnesio, Solucao solida")
    expect(foldAccents("Árvores binárias")).toBe("Arvores binarias")
  })
})

describe("searchChapters", () => {
  const index = createSearchIndex(documents)

  it("encontra 'magnésio' digitando 'magnesio'", () => {
    const hits = searchChapters(index, "magnesio")

    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].guideTitle).toBe("Magnésio")
    expect(hits[0].title).toContain("magnésio")
    expect(hits[0].matchedFields).toContain("title")
  })

  it("encontra 'solução sólida' digitando 'solucao solida'", () => {
    const [first] = searchChapters(index, "solucao solida")

    expect(first.id).toBe(SOLUCAO_TITLE)
    expect(first.title).toBe("Solução sólida e precipitação")
    expect(first.tier).toBe(0)
  })

  it("ranqueia acerto no título acima de acerto só no corpo", () => {
    const hits = searchChapters(index, "solucao")

    const titleHit = positionOf(hits, SOLUCAO_TITLE)
    const bodyHit = positionOf(hits, SOLUCAO_BODY)

    expect(titleHit).toBe(0)
    expect(bodyHit).toBeGreaterThan(titleHit)
    expect(hits[bodyHit].matchedFields).toEqual(["text"])
    expect(hits[bodyHit].tier).toBe(2)
  })

  it("agrupa por guia na ordem de relevância", () => {
    const groups = groupHits(searchChapters(index, "solucao"))

    expect(groups[0].guideTitle).toBe("Alumínio")
    expect(groups.map((group) => group.guideId)).toEqual(["aluminio"])
    expect(groups[0].hits.map((hit) => hit.id)).toEqual(ids(searchChapters(index, "solucao")))
  })

  it("devolve lista vazia quando nada corresponde ou a consulta é vazia", () => {
    expect(searchChapters(index, "zzzzzz")).toEqual([])
    expect(searchChapters(index, "   ")).toEqual([])
    expect(searchChapters(createSearchIndex([]), "magnesio")).toEqual([])
  })

  it("expoe o heading que casou com a consulta", () => {
    const hits = searchChapters(index, "guinier")

    expect(hits[0].id).toBe(SOLUCAO_TITLE)
    expect(hits[0].matchedHeading).toBe("4.2 Zonas de Guinier-Preston")
  })
})

describe("highlightSegments", () => {
  it("marca a palavra acentuada e preserva o texto original", () => {
    const segments = highlightSegments("O magnésio é leve", "magnesio")

    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      "magnésio",
    ])
    expect(segments.map((segment) => segment.text).join("")).toBe("O magnésio é leve")
  })

  it("marca prefixos enquanto a pessoa digita", () => {
    const segments = highlightSegments("Solução sólida", "sol")

    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      "Solução",
      "sólida",
    ])
  })

  it("não marca nada quando a consulta está vazia", () => {
    expect(highlightSegments("Magnésio", "")).toEqual([{ text: "Magnésio", match: false }])
  })
})

describe("excerptFor", () => {
  it("recorta em volta do primeiro acerto e sinaliza o corte", () => {
    const text =
      "O aquecimento controlado promove a solução sólida dos elementos de liga na matriz. " +
      "O resfriamento rápido retém a solução sólida supersaturada e o envelhecimento precipita fases finas."

    const excerpt = excerptFor(text, "solida")

    expect(excerpt).toContain("solução sólida")
    expect(excerpt.length).toBeLessThanOrEqual(180)
    expect(excerpt.startsWith("…") || excerpt.endsWith("…")).toBe(true)
  })

  it("devolve o texto curto inteiro", () => {
    expect(excerptFor("Magnésio leve", "magnesio")).toBe("Magnésio leve")
  })
})

describe("loadSearchCorpus", () => {
  it("lê o array emitido pelo build", async () => {
    const corpus = await loadSearchCorpus(async () => ({ ok: true, json: async () => documents }))

    expect(corpus).toHaveLength(documents.length)
    expect(corpus[0]).toHaveProperty("guideTitle")
  })

  it("devolve lista vazia quando o arquivo ainda não existe", async () => {
    const missing = await loadSearchCorpus(async () => {
      throw new Error("404")
    })
    const notOk = await loadSearchCorpus(async () => ({ ok: false, json: async () => documents }))
    const wrongShape = await loadSearchCorpus(async () => ({ ok: true, json: async () => ({}) }))

    expect(missing).toEqual([])
    expect(notOk).toEqual([])
    expect(wrongShape).toEqual([])
  })
})

describe("buscas recentes", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetRecentQueriesCache()
  })

  it("persiste, deduplica sem acento e limita o histórico", () => {
    rememberQuery("  magnesio  ")
    rememberQuery("solucao solida")

    expect(JSON.parse(window.localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]")).toEqual([
      "solucao solida",
      "magnesio",
    ])

    rememberQuery("Magnésio")

    expect(JSON.parse(window.localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]")).toEqual([
      "Magnésio",
      "solucao solida",
    ])

    for (let term = 0; term < 12; term += 1) rememberQuery(`termo ${term}`)

    expect(JSON.parse(window.localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]")).toHaveLength(
      MAX_RECENT_QUERIES,
    )
  })
})

describe("useSearch", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetRecentQueriesCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("espera a pausa da digitação antes de buscar", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSearch({ documents, debounceMs: 120 }))

    act(() => {
      result.current.setQuery("magnesio")
    })

    expect(result.current.results).toEqual([])
    expect(result.current.isPending).toBe(true)

    act(() => {
      vi.advanceTimersByTime(120)
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.groups[0].guideTitle).toBe("Magnésio")
  })

  it("expõe buscas recentes reativas", () => {
    const { result } = renderHook(() => useSearch({ documents }))

    act(() => {
      result.current.remember("niobio")
    })

    expect(result.current.recentQueries).toEqual(["niobio"])
  })

  it("relê as buscas recentes do localStorage em uma nova sessão", () => {
    rememberQuery("solucao solida")
    resetRecentQueriesCache()

    const { result } = renderHook(() => useSearch({ documents }))

    expect(result.current.recentQueries).toEqual(["solucao solida"])
  })
})
