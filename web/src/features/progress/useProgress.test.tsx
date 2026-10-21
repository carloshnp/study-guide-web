import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ToastProvider } from "@/components/ui/toast"
import { resetProgressStore, useProgress, useUnitProgress } from "./useProgress"

const GUIDE = "aluminio"
const CHAPTER = "01-o-aluminio"
const UNIT_A = `${GUIDE}/${CHAPTER}/1-introducao`
const UNIT_B = `${GUIDE}/${CHAPTER}/11-propriedades`

type FetchCall = { init: RequestInit; url: string }

let calls: FetchCall[] = []
let storedUnits: Record<string, "done" | "review"> = {}
let putResponse: () => Promise<Response> = () => Promise.resolve(json({}))

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

function installFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ init, url })
      if ((init.method ?? "GET") === "GET") {
        return json({ count: Object.keys(storedUnits).length, guideId: GUIDE, units: storedUnits })
      }
      const payload = JSON.parse(String(init.body)) as Record<string, unknown>
      const response = await putResponse()
      if (!response.ok) return response
      return json({ ...payload, updatedAt: "2026-10-21T02:00:00Z" })
    }),
  )
}

function putCalls(): FetchCall[] {
  return calls.filter((call) => call.init.method === "PUT")
}

function bodyOf(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>
}

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

beforeEach(() => {
  resetProgressStore()
  calls = []
  storedUnits = { [UNIT_A]: "review" }
  putResponse = () => Promise.resolve(json({}))
  installFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetProgressStore()
})

describe("useUnitProgress", () => {
  it("loads the stored state for the guide on mount", async () => {
    const { result } = renderHook(() => useUnitProgress(GUIDE, UNIT_A))

    expect(result.current.status).toBe("absent")

    await waitFor(() => expect(result.current.status).toBe("review"))
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain(`guideId=${GUIDE}`)
  })

  it("shares one GET between every check on the same guide", async () => {
    renderHook(
      () => ({
        a: useUnitProgress(GUIDE, UNIT_A),
        b: useUnitProgress(GUIDE, UNIT_B),
      }),
      { wrapper },
    )

    await waitFor(() => expect(calls.filter((call) => call.init.method === "GET")).toHaveLength(1))
  })

  it("applies the state optimistically and issues exactly one PUT", async () => {
    let release: (response: Response) => void = () => undefined
    putResponse = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })

    const { result } = renderHook(() => useUnitProgress(GUIDE, UNIT_A))
    await waitFor(() => expect(result.current.status).toBe("review"))

    act(() => {
      void result.current.toggle("done")
    })

    // Optimistic: visible before the request settles.
    expect(result.current.status).toBe("done")
    expect(result.current.isSaving).toBe(true)
    expect(putCalls()).toHaveLength(1)
    expect(bodyOf(putCalls()[0])).toEqual({ guideId: GUIDE, status: "done", unitId: UNIT_A })

    await act(async () => {
      release(json({ guideId: GUIDE, status: "done", unitId: UNIT_A }))
      await Promise.resolve()
    })

    expect(result.current.status).toBe("done")
    expect(result.current.isSaving).toBe(false)
  })

  it("rolls back and raises a toast when the write fails", async () => {
    putResponse = () => Promise.resolve(json({ detail: "boom" }, 500))

    const { result } = renderHook(() => useUnitProgress(GUIDE, UNIT_A), { wrapper })
    await waitFor(() => expect(result.current.status).toBe("review"))

    await act(async () => {
      await result.current.toggle("done")
    })

    expect(result.current.status).toBe("review")
    expect(result.current.isSaving).toBe(false)

    await waitFor(() => expect(document.body.textContent).toMatch(/Progresso não salvo/))
    expect(document.body.textContent).toMatch(/desfeita/)
  })

  it("clears the stored state when toggling the same state again", async () => {
    const { result } = renderHook(() => useUnitProgress(GUIDE, UNIT_A))
    await waitFor(() => expect(result.current.status).toBe("review"))

    await act(async () => {
      await result.current.toggle("review")
    })

    expect(result.current.status).toBe("absent")
    expect(bodyOf(putCalls()[0])).toMatchObject({ status: "absent", unitId: UNIT_A })
  })
})

describe("useProgress aggregates", () => {
  it("rolls the loaded units up to chapter and guide", async () => {
    storedUnits = { [UNIT_A]: "done", [UNIT_B]: "review" }
    const units = [UNIT_A, UNIT_B, `${GUIDE}/${CHAPTER}`, `${GUIDE}/02-ligas/21-fundicao`]

    const { result } = renderHook(() => useProgress(GUIDE))
    await waitFor(() => expect(result.current.statuses[UNIT_A]).toBe("done"))

    const summary = result.current.summary(units)
    expect(summary.chapters[CHAPTER]).toEqual({ done: 1, review: 1, total: 3 })
    expect(summary.guide).toEqual({ done: 1, review: 1, total: 4 })
    expect(result.current.counts(units)).toEqual({ done: 1, review: 1, total: 4 })
  })
})
