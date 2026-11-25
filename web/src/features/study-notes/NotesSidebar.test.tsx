import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { NotesSidebar } from "./NotesSidebar"
import { StudyNotesProvider, useStudyNotes } from "./StudyNotesContext"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  })
}

function renderSidebar(initialPath = "/") {
  const router = createMemoryRouter(
    [
      {
        element: <NotesSidebar onOpenChange={() => undefined} open />,
        path: "*",
      },
      {
        element: <NotesSidebar onOpenChange={() => undefined} open />,
        path: "/g/:guideId/c/:chapterSlug",
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe("NotesSidebar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates a standalone note, autosaves edits, and renders derived quote links", async () => {
    const user = userEvent.setup()
    const createdNote = {
      body: "",
      createdAt: "2026-11-24T12:00:00Z",
      id: 1,
      links: [],
      title: "Sem título",
      updatedAt: "2026-11-24T12:00:00Z",
    }
    const savedNote = {
      body: "Ver [Torção](/g/torcao/c/02-dist#tensao)",
      createdAt: "2026-11-24T12:00:00Z",
      id: 1,
      links: [{ chapterId: "02-dist", guideId: "torcao", sectionId: "tensao" }],
      title: "Sem título",
      updatedAt: "2026-11-24T12:01:00Z",
    }

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/study-notes" && method === "GET") {
        return jsonResponse({ notes: [] })
      }
      if (url === "/api/study-notes" && method === "POST") {
        return jsonResponse(createdNote, 201)
      }
      if (url === "/api/study-notes/1" && method === "PUT") {
        return jsonResponse(savedNote)
      }
      return jsonResponse({ detail: `unexpected ${method} ${url}` }, 500)
    })

    renderSidebar("/")

    await user.click(await screen.findByRole("button", { name: /nova nota/i }))

    const editor = await screen.findByRole("textbox", { name: /conteúdo da nota/i })
    await user.type(editor, "Ver [[Torção](/g/torcao/c/02-dist#tensao)")

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/study-notes/1",
          expect.objectContaining({ method: "PUT" }),
        )
      },
      { timeout: 2500 },
    )

    const link = await screen.findByRole("link", { name: /torcao/i })
    expect(link).toHaveAttribute("href", "/g/torcao/c/02-dist#tensao")
  })

  it("filters notes by the current chapter when viewing a chapter route", async () => {
    const user = userEvent.setup()
    const allNotes = [
      {
        createdAt: "2026-11-24T12:00:00Z",
        excerpt: "Livre",
        id: 1,
        links: [],
        title: "Nota solta",
        updatedAt: "2026-11-24T12:00:00Z",
      },
      {
        createdAt: "2026-11-24T12:01:00Z",
        excerpt: "Citação",
        id: 2,
        links: [{ chapterId: "02-dist", guideId: "torcao", sectionId: null }],
        title: "Nota da torção",
        updatedAt: "2026-11-24T12:01:00Z",
      },
    ]

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/study-notes") {
        return jsonResponse({ notes: allNotes })
      }
      if (url === "/api/study-notes?guideId=torcao&chapterId=02-dist") {
        return jsonResponse({ notes: [allNotes[1]] })
      }
      return jsonResponse({ detail: `unexpected ${url}` }, 500)
    })

    renderSidebar("/g/torcao/c/02-dist")

    expect(await screen.findByText("Nota solta")).toBeInTheDocument()
    expect(screen.getByText("Nota da torção")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /deste capítulo/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/study-notes?guideId=torcao&chapterId=02-dist",
        expect.anything(),
      )
    })
    expect(screen.queryByText("Nota solta")).not.toBeInTheDocument()
    expect(screen.getByText("Nota da torção")).toBeInTheDocument()
  })

  it("preserves unsaved draft and offers retry on save failure, and supports deleting notes", async () => {
    const user = userEvent.setup()
    let failNextPut = true
    const note = {
      body: "Inicial",
      createdAt: "2026-11-24T12:00:00Z",
      id: 5,
      links: [],
      title: "Nota com erro",
      updatedAt: "2026-11-24T12:00:00Z",
    }

    let lastSavedBody = ""
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/study-notes" && method === "GET") {
        return jsonResponse({
          notes: [
            {
              createdAt: note.createdAt,
              excerpt: note.body,
              id: note.id,
              links: [],
              title: note.title,
              updatedAt: note.updatedAt,
            },
          ],
        })
      }
      if (url === "/api/study-notes/5" && method === "GET") {
        return jsonResponse(note)
      }
      if (url === "/api/study-notes/5" && method === "PUT") {
        if (failNextPut) {
          failNextPut = false
          return jsonResponse({ detail: "Disco cheio" }, 500)
        }
        const sent = JSON.parse(String(init?.body)) as { title: string; body: string }
        lastSavedBody = sent.body
        return jsonResponse({ ...note, body: sent.body, title: sent.title })
      }
      if (url === "/api/study-notes/5" && method === "DELETE") {
        return new Response(null, { status: 204 })
      }
      return jsonResponse({ detail: `unexpected ${method} ${url}` }, 500)
    })

    renderSidebar("/")

    await user.click(await screen.findByText("Nota com erro"))
    const topbar = document.querySelector("[data-slot='notes-topbar']")
    expect(topbar).not.toBeNull()
    expect(topbar?.querySelector("input[aria-label='Título da nota']")).not.toBeNull()
    expect(topbar?.querySelector("button[aria-label='Excluir nota']")).not.toBeNull()

    const editor = await screen.findByRole("textbox", { name: /conteúdo da nota/i })
    await user.click(screen.getByRole("button", { name: /título/i }))

    expect(await screen.findByText(/disco cheio/i, {}, { timeout: 2500 })).toBeInTheDocument()
    expect(editor).toHaveTextContent(/inicial/i)

    await user.click(screen.getByRole("button", { name: /tentar de novo/i }))
    expect(await screen.findByText(/salvo/i)).toBeInTheDocument()
    expect(lastSavedBody).toBe("## Inicial")

    await user.click(screen.getByRole("button", { name: /excluir nota/i }))
    await waitFor(() => {
      expect(screen.queryByText("Nota com erro")).not.toBeInTheDocument()
    })
  })

  it("opens the sidebar, attaches the guide link at the top (not in body), and lets the user remove it", async () => {
    const user = userEvent.setup()
    let createdPayload: { title: string; body: string; links?: unknown[] } | null = null
    let lastUpdatedLinks: unknown[] | null = null

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/study-notes" && method === "GET") {
        return jsonResponse({ notes: [] })
      }
      if (url === "/api/study-notes" && method === "POST") {
        const sent = JSON.parse(String(init?.body)) as {
          title: string
          body: string
          links?: unknown[]
        }
        createdPayload = sent
        return jsonResponse(
          {
            body: sent.body,
            createdAt: "2026-11-24T12:00:00Z",
            id: 42,
            links: sent.links ?? [],
            title: sent.title,
            updatedAt: "2026-11-24T12:00:00Z",
          },
          201,
        )
      }
      if (url === "/api/study-notes/42" && method === "PUT") {
        const sent = JSON.parse(String(init?.body)) as {
          title: string
          body: string
          links?: unknown[]
        }
        lastUpdatedLinks = sent.links ?? []
        return jsonResponse({
          body: sent.body,
          createdAt: "2026-11-24T12:00:00Z",
          id: 42,
          links: sent.links ?? [],
          title: sent.title,
          updatedAt: "2026-11-24T12:01:00Z",
        })
      }
      return jsonResponse({ detail: `unexpected ${method} ${url}` }, 500)
    })

    function Harness() {
      const notes = useStudyNotes()
      return (
        <>
          <button
            onClick={() =>
              notes.requestInsertQuote({
                chapterSlug: "02-dist",
                chapterTitle: "Distribuição de tensões",
                guideId: "torcao",
                markdown: "A tensão máxima é $\\tau_{\\max} = \\frac{Tc}{J}$.",
                sectionId: "tensao-maxima",
                text: "A tensão máxima é τ_max = Tc/J.",
              })
            }
            type="button"
          >
            Simular citação
          </button>
          <NotesSidebar onOpenChange={notes.setOpen} open={notes.open} />
        </>
      )
    }

    const router = createMemoryRouter(
      [
        {
          element: (
            <StudyNotesProvider>
              <Harness />
            </StudyNotesProvider>
          ),
          path: "*",
        },
      ],
      { initialEntries: ["/g/torcao/c/02-dist"] },
    )
    render(<RouterProvider router={router} />)

    await user.click(screen.getByRole("button", { name: /simular citação/i }))

    const link = await screen.findByRole("link", { name: /torcao \/ 02-dist #tensao-maxima/i })
    expect(link).toHaveAttribute("href", "/g/torcao/c/02-dist#tensao-maxima")
    expect(createdPayload).not.toBeNull()
    expect(createdPayload!.title).toBe("Distribuição de tensões")
    // Body holds pure markdown (no URL appended), while links carries the guide reference.
    expect(createdPayload!.body).toBe("A tensão máxima é $\\tau_{\\max} = \\frac{Tc}{J}$.")
    expect(createdPayload!.links).toEqual([
      { chapterId: "02-dist", guideId: "torcao", sectionId: "tensao-maxima" },
    ])

    // "Salvo" renders in notes-topbar, not a bottom footer.
    const topbar = document.querySelector("[data-slot='notes-topbar']")
    expect(topbar?.querySelector("[data-slot='notes-save-status']")).toHaveTextContent(/salvo/i)

    // Clicking the chip's X button removes the link from the note and persists links: [].
    await user.click(screen.getByRole("button", { name: /remover vínculo/i }))
    await waitFor(() => {
      expect(lastUpdatedLinks).toEqual([])
    })
    expect(screen.queryByRole("link", { name: /torcao/i })).toBeNull()

    // Mobile sheet renders exactly one close button inside notes-topbar.
    expect(screen.getAllByRole("button", { name: /fechar anotações/i })).toHaveLength(1)
  })
})
