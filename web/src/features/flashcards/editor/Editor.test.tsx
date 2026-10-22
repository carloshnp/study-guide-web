import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { bodyOf, stubApi } from "../__fixtures__/api"
import { Editor, type EditorSeed } from "./Editor"

const SEED: EditorSeed = {
  chapterSlug: "01-estrutura",
  front: "A camada passiva é {{c1::ferrita}} e {{c2::cementita}}.",
  guideId: "magnesio",
  kind: "cloze",
  sectionId: "12-fases",
  sourceSnippet: "A camada passiva é ferrita e cementita.",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Editor", () => {
  it("opens with the selection seed and previews the cloze lacunas", async () => {
    stubApi([])
    render(<Editor onOpenChange={() => undefined} open seed={SEED} />)

    expect(await screen.findByRole("heading", { name: "Novo card" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Texto com lacunas" })).toHaveValue(SEED.front)

    // The lacuna list names the answers, the question preview hides them.
    expect(screen.getByText("Lacunas identificadas")).toBeInTheDocument()
    expect(screen.getAllByText("ferrita").length).toBeGreaterThan(0)
    expect(screen.getAllByText("cementita").length).toBeGreaterThan(0)
    expect((await screen.findAllByText("[…]")).length).toBeGreaterThan(0)

    // The source quote and its anchor stay visible and read-only.
    expect(screen.getByText("Trecho de origem")).toBeInTheDocument()
    expect(screen.getByText("magnesio › 01-estrutura › 12-fases")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Resposta" })).not.toBeInTheDocument()
  })

  it("saves a new note with the anchor and the source snippet", async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    const fetchMock = stubApi([
      {
        method: "POST",
        path: "/api/flashcards/notes",
        respond: (init) => ({ id: 7, ...bodyOf(init) }),
      },
    ])

    render(
      <Editor
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        open
        seed={{
          back: "Ferrita",
          chapterSlug: "01-estrutura",
          front: "Qual fase é cúbica de corpo centrado?",
          guideId: "magnesio",
          sectionId: "12-fases",
          sourceSnippet: "A ferrita é CCC.",
        }}
      />,
    )

    await user.click(await screen.findByRole("button", { name: /salvar card/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const [call] = fetchMock.mock.calls
    expect(String(call?.[0])).toBe("/api/flashcards/notes")
    expect(call?.[1]?.method).toBe("POST")
    expect(bodyOf(call?.[1])).toMatchObject({
      back: "Ferrita",
      chapterSlug: "01-estrutura",
      front: "Qual fase é cúbica de corpo centrado?",
      guideId: "magnesio",
      kind: "basic",
      sectionId: "12-fases",
      sourceSnippet: "A ferrita é CCC.",
      tags: "",
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("blocks a cloze note without a lacuna", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([])
    render(<Editor onOpenChange={() => undefined} open seed={{ kind: "cloze" }} />)

    const front = await screen.findByRole("textbox", { name: "Texto com lacunas" })
    await user.type(front, "Sem lacunas aqui")
    await user.click(screen.getByRole("button", { name: /salvar card/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/lacuna/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("patches an existing note instead of creating another", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        method: "PATCH",
        path: "/api/flashcards/notes/9",
        respond: (init) => ({ id: 9, ...bodyOf(init) }),
      },
    ])

    render(
      <Editor
        note={{
          back: "Antiga",
          chapterSlug: null,
          front: "Frente antiga",
          guideId: null,
          id: 9,
          kind: "basic",
          sectionId: null,
          tags: "",
        }}
        onOpenChange={() => undefined}
        open
      />,
    )

    const back = await screen.findByRole("textbox", { name: "Resposta" })
    await user.clear(back)
    await user.type(back, "Nova resposta")
    await user.click(screen.getByRole("button", { name: /salvar card/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [call] = fetchMock.mock.calls
    expect(String(call?.[0])).toBe("/api/flashcards/notes/9")
    expect(call?.[1]?.method).toBe("PATCH")
    expect(bodyOf(call?.[1])).toMatchObject({ back: "Nova resposta", front: "Frente antiga" })
  })
})
