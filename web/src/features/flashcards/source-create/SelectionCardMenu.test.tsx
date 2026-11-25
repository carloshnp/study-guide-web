import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SelectionCardMenu, type CardFromSelection, type HighlightFromSelection } from "./SelectionCardMenu"

function select(anchorNode: Node, text: string) {
  const range = {
    getBoundingClientRect: () => ({
      bottom: 120,
      height: 20,
      left: 40,
      right: 220,
      top: 100,
      width: 180,
      x: 40,
      y: 100,
    }),
  }
  const selection = {
    anchorNode,
    focusNode: anchorNode,
    getRangeAt: () => range,
    isCollapsed: false,
    rangeCount: 1,
    removeAllRanges: vi.fn(),
    toString: () => text,
  }
  vi.spyOn(window, "getSelection").mockReturnValue(selection as unknown as Selection)
}

function renderMenu(
  onRequestCreate: (input: CardFromSelection) => void = vi.fn(),
  onRequestQuote?: (input: CardFromSelection) => void,
  onRequestHighlight?: (input: HighlightFromSelection) => void,
) {
  const view = render(
    <SelectionCardMenu
      chapterSlug="01-estrutura"
      guideId="magnesio"
      onRequestCreate={onRequestCreate}
      onRequestHighlight={onRequestHighlight}
      onRequestQuote={onRequestQuote}
      sections={[{ id: "12-fases" }, { id: "13-propriedades" }]}
    >
      <article>
        <h2 id="12-fases">2. Fases</h2>
        <p>A camada passiva é ferrita e cementita.</p>
        <h2 id="13-propriedades">3. Propriedades</h2>
        <p>Dureza aumenta com o carbono.</p>
      </article>
    </SelectionCardMenu>,
  )
  return { ...view, onRequestCreate }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("SelectionCardMenu", () => {
  it("offers the floating button for a selection and opens the editor with the anchor", async () => {
    const user = userEvent.setup()
    const { container, onRequestCreate } = renderMenu()
    const paragraph = container.querySelectorAll("p")[0]
    select(paragraph?.firstChild as Node, "a camada passiva é ferrita")

    fireEvent.mouseUp(document)

    const button = await screen.findByRole("button", { name: /criar card/i })
    expect(button).toHaveTextContent("Criar card")

    await user.click(button)

    expect(onRequestCreate).toHaveBeenCalledWith({
      chapterSlug: "01-estrutura",
      front: "a camada passiva é ferrita",
      guideId: "magnesio",
      sectionId: "12-fases",
      sourceSnippet: "a camada passiva é ferrita",
    })
  })

  it("links the passage to the heading that precedes it", async () => {
    const user = userEvent.setup()
    const { container, onRequestCreate } = renderMenu()
    const secondParagraph = container.querySelectorAll("p")[1]
    select(secondParagraph?.firstChild as Node, "dureza aumenta com o carbono")

    fireEvent.mouseUp(document)
    await user.click(await screen.findByRole("button", { name: /criar card/i }))

    expect(onRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sectionId: "13-propriedades" }),
    )
  })

  it("ignores a selection outside the article", async () => {
    const { container } = renderMenu()
    const outside = document.createElement("p")
    outside.textContent = "texto da barra lateral"
    document.body.append(outside)
    select(outside.firstChild as Node, "texto da barra lateral")

    fireEvent.mouseUp(document)

    expect(screen.queryByRole("button", { name: /criar card/i })).toBeNull()
    expect(container).toBeInTheDocument()
    outside.remove()
  })

  it("adds Criar card to the selection menu on right click", async () => {
    const user = userEvent.setup()
    const { container, onRequestCreate } = renderMenu()
    const paragraph = container.querySelectorAll("p")[0]
    select(paragraph?.firstChild as Node, "a camada passiva é ferrita")

    fireEvent.contextMenu(container.querySelector("article") as HTMLElement, {
      clientX: 120,
      clientY: 180,
    })

    const item = await screen.findByRole("menuitem", { name: /criar card/i })
    expect(screen.queryByRole("button", { name: /criar card/i })).toBeNull()

    await user.click(item)

    expect(onRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterSlug: "01-estrutura",
        front: "a camada passiva é ferrita",
        guideId: "magnesio",
        sectionId: "12-fases",
      }),
    )
  })

  it("offers Citar nas notas in the floating bar and context menu when onRequestQuote is passed", async () => {
    const user = userEvent.setup()
    const onRequestQuote = vi.fn()
    const { container } = renderMenu(vi.fn(), onRequestQuote)
    const paragraph = container.querySelectorAll("p")[0]
    select(paragraph?.firstChild as Node, "a camada passiva é ferrita")

    fireEvent.mouseUp(document)
    await user.click(await screen.findByRole("button", { name: /citar nas notas/i }))

    expect(onRequestQuote).toHaveBeenCalledWith({
      chapterSlug: "01-estrutura",
      front: "a camada passiva é ferrita",
      guideId: "magnesio",
      markdown: "a camada passiva é ferrita",
      sectionId: "12-fases",
      sourceSnippet: "a camada passiva é ferrita",
    })
  })

  it("offers 4 color highlight swatches in the floating bar and context menu", async () => {
    const user = userEvent.setup()
    const onRequestHighlight = vi.fn()
    const { container } = renderMenu(vi.fn(), undefined, onRequestHighlight)
    const paragraph = container.querySelectorAll("p")[0]
    select(paragraph?.firstChild as Node, "a camada passiva é ferrita")

    fireEvent.mouseUp(document)
    await user.click(await screen.findByRole("button", { name: /destacar em amarelo/i }))

    expect(onRequestHighlight).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "yellow",
        sectionId: "12-fases",
      }),
    )

    select(paragraph?.firstChild as Node, "a camada passiva é ferrita")
    fireEvent.contextMenu(container.querySelector("article") as HTMLElement, {
      clientX: 120,
      clientY: 180,
    })
    await user.click(await screen.findByRole("menuitem", { name: /destacar em rosa/i }))

    expect(onRequestHighlight).toHaveBeenLastCalledWith(
      expect.objectContaining({
        color: "pink",
        sectionId: "12-fases",
      }),
    )
  })
})
