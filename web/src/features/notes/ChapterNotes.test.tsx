import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChapterNotes } from "./ChapterNotes"

const GUIDE = "aluminio"
const CHAPTER = "01-o-aluminio"
const FIELD = "Suas anotações"

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

function renderNotes() {
  render(<ChapterNotes chapterId={CHAPTER} chapterTitle="O alumínio" guideId={GUIDE} />)
}

async function openNotes(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Anotações" }))
  return screen.findByRole("textbox", { name: FIELD })
}

beforeEach(() => {
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
      if (failPut) return json({ detail: "servidor indisponível" }, 503)
      storedBody = payload.body.trim() === "" ? "" : payload.body
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
  vi.unstubAllGlobals()
})

describe("ChapterNotes", () => {
  it("opens the sheet with the stored note", async () => {
    storedBody = "anotação antiga"
    const user = userEvent.setup()
    renderNotes()

    const field = await openNotes(user)

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    await waitFor(() => expect(field).toHaveValue("anotação antiga"))
    expect(screen.getByText(/Capítulo: O alumínio/)).toBeInTheDocument()
  })

  it("autosaves a burst of typing and shows the saved indicator", async () => {
    const user = userEvent.setup()
    renderNotes()
    const field = await openNotes(user)

    await user.type(field, "primeira ideia")
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000 })

    expect(bodyOf(putCalls()[0])).toMatchObject({ body: "primeira ideia" })
    await waitFor(() => expect(screen.getByText("Salvo")).toBeInTheDocument())
    expect(screen.queryByText("Salvando…")).not.toBeInTheDocument()
  })

  it("keeps the failed draft when the sheet is closed and asks before discarding", async () => {
    failPut = true
    const user = userEvent.setup()
    renderNotes()
    const field = await openNotes(user)

    await user.type(field, "rascunho")
    await waitFor(() => expect(screen.getByText("Não salvo")).toBeInTheDocument(), {
      timeout: 3000,
    })

    await user.click(screen.getByRole("button", { name: "Fechar anotações" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("Descartar anotações não salvas?"),
    ).toBeInTheDocument()

    // Stay in the sheet: the draft survives.
    await user.click(within(dialog).getByRole("button", { name: "Continuar editando" }))
    expect(await screen.findByRole("textbox", { name: FIELD })).toHaveValue("rascunho")

    // Close again and confirm the discard.
    await user.click(screen.getByRole("button", { name: "Fechar anotações" }))
    const again = await screen.findByRole("alertdialog")
    await user.click(within(again).getByRole("button", { name: "Descartar" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    // Reopening shows the last saved body, i.e. empty.
    const reopened = await openNotes(user)
    await waitFor(() => expect(reopened).toHaveValue(""))
  })

  it("retries from the sheet footer", async () => {
    failPut = true
    const user = userEvent.setup()
    renderNotes()
    const field = await openNotes(user)

    await user.type(field, "tentar de novo")
    await waitFor(() => expect(screen.getByText("Não salvo")).toBeInTheDocument(), {
      timeout: 3000,
    })

    failPut = false
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }))

    await waitFor(() => expect(putCalls()).toHaveLength(2))
    await waitFor(() => expect(screen.getByText("Salvo")).toBeInTheDocument())
    expect(storedBody).toBe("tentar de novo")
  })

  it("deletes the note when the text is cleared", async () => {
    storedBody = "texto que vai sair"
    const user = userEvent.setup()
    renderNotes()
    const field = await openNotes(user)
    await waitFor(() => expect(field).toHaveValue("texto que vai sair"))

    await user.clear(field)
    await waitFor(() => expect(putCalls()).toHaveLength(1), { timeout: 3000 })

    expect(bodyOf(putCalls()[0])).toMatchObject({ body: "" })
    expect(storedBody).toBe("")
  })
})
