import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AUTOSAVE_DELAY_MS, useNotes } from "./useNotes"

const GUIDE = "aluminio"
const CHAPTER = "01-o-aluminio"

type FetchCall = { init: RequestInit; url: string }

let calls: FetchCall[] = []
let storedBody = ""
let failPut = false

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

function putCalls(): FetchCall[] {
  return calls.filter((call) => call.init.method === "PUT")
}

function bodyOf(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>
}

async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  calls = []
  storedBody = ""
  failPut = false
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ init, url })
      if ((init.method ?? "GET") === "GET") {
        return json({
          body: storedBody,
          chapterId: CHAPTER,
          guideId: GUIDE,
          updatedAt: storedBody ? "2026-10-21T02:00:00Z" : null,
        })
      }
      const payload = JSON.parse(String(init.body)) as { body: string }
      if (failPut) return json({ detail: "disco cheio" }, 500)
      const blank = payload.body.trim() === ""
      storedBody = blank ? "" : payload.body
      return json({
        body: storedBody,
        chapterId: CHAPTER,
        guideId: GUIDE,
        updatedAt: storedBody ? "2026-10-21T02:00:01Z" : null,
      })
    }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("useNotes", () => {
  it("loads the stored note on mount", async () => {
    storedBody = "primeira anotação"
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))

    expect(result.current.status).toBe("loading")
    await flush()

    expect(result.current.status).toBe("saved")
    expect(result.current.draft).toBe("primeira anotação")
    expect(result.current.savedBody).toBe("primeira anotação")
    expect(result.current.isDirty).toBe(false)
  })

  it("collapses a burst of keystrokes into one PUT after 800ms", async () => {
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))
    await flush()

    act(() => result.current.change("a"))
    act(() => result.current.change("al"))
    act(() => result.current.change("alu"))

    await advance(AUTOSAVE_DELAY_MS - 1)
    expect(putCalls()).toHaveLength(0)

    await advance(1)
    expect(putCalls()).toHaveLength(1)
    expect(bodyOf(putCalls()[0])).toEqual({
      body: "alu",
      chapterId: CHAPTER,
      guideId: GUIDE,
    })

    expect(result.current.status).toBe("saved")
    expect(result.current.savedBody).toBe("alu")
  })

  it("saves a blank draft as an empty body, which deletes the note", async () => {
    storedBody = "texto antigo"
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))
    await flush()

    act(() => result.current.change(""))
    await advance(AUTOSAVE_DELAY_MS)

    expect(putCalls()).toHaveLength(1)
    expect(bodyOf(putCalls()[0])).toMatchObject({ body: "" })
    expect(result.current.savedBody).toBe("")
    expect(result.current.status).toBe("saved")
  })

  it("keeps the draft and stops retrying when a save fails", async () => {
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))
    await flush()
    failPut = true

    act(() => result.current.change("rascunho"))
    await advance(AUTOSAVE_DELAY_MS)

    expect(putCalls()).toHaveLength(1)
    expect(result.current.status).toBe("error")
    expect(result.current.error).toMatch(/disco cheio/)
    expect(result.current.draft).toBe("rascunho")
    expect(result.current.hasFailedDraft).toBe(true)

    // No automatic retry storm: the same failed text is not sent again.
    await advance(AUTOSAVE_DELAY_MS * 3)
    expect(putCalls()).toHaveLength(1)
  })

  it("retries on demand and clears the failed draft", async () => {
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))
    await flush()
    failPut = true
    act(() => result.current.change("rascunho"))
    await advance(AUTOSAVE_DELAY_MS)

    failPut = false
    let ok = false
    await act(async () => {
      ok = await result.current.retry()
    })

    expect(ok).toBe(true)
    expect(putCalls()).toHaveLength(2)
    expect(result.current.status).toBe("saved")
    expect(result.current.hasFailedDraft).toBe(false)
    expect(result.current.savedBody).toBe("rascunho")
  })

  it("discards the draft back to the saved body", async () => {
    storedBody = "salvo"
    const { result } = renderHook(() => useNotes(GUIDE, CHAPTER))
    await flush()
    failPut = true

    act(() => result.current.change("perdido"))
    await advance(AUTOSAVE_DELAY_MS)
    expect(result.current.hasFailedDraft).toBe(true)

    act(() => result.current.discard())

    expect(result.current.draft).toBe("salvo")
    expect(result.current.isDirty).toBe(false)
    expect(result.current.hasFailedDraft).toBe(false)
  })
})
