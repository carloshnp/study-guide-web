import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { MarkdownRenderer } from "../MarkdownRenderer"
import type { ChapterImage } from "@/lib/content"

const IMAGE: ChapterImage = {
  src: "/media/abc123/1280.webp",
  srcset: "/media/abc123/640.webp 640w, /media/abc123/1280.webp 1280w",
  width: 1280,
  height: 720,
  alt: "Diagrama de equilíbrio Al-Cu",
  original: "/media/abc123/original.png",
}

const MARKDOWN = "![Diagrama de equilíbrio Al-Cu](/media/abc123/1280.webp)"

function renderFigure() {
  return render(
    <MemoryRouter>
      <MarkdownRenderer images={[IMAGE]} markdown={MARKDOWN} />
    </MemoryRouter>,
  )
}

describe("ChapterFigure", () => {
  it("renders a figure with the alt as caption, explicit dimensions and lazy loading", () => {
    const { container } = renderFigure()

    const figure = container.querySelector("figure")
    expect(figure).not.toBeNull()
    expect(figure?.querySelector("figcaption")).toHaveTextContent(IMAGE.alt)

    const img = screen.getByRole("img", { name: IMAGE.alt })
    expect(img).toHaveAttribute("width", "1280")
    expect(img).toHaveAttribute("height", "720")
    expect(img).toHaveAttribute("loading", "lazy")
    expect(img).toHaveAttribute("srcset", IMAGE.srcset)
  })

  it("opens a lightbox with the original file and closes on Esc returning focus", async () => {
    const user = userEvent.setup()
    renderFigure()

    const trigger = screen.getByRole("button", { name: `Ampliar figura: ${IMAGE.alt}` })
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: IMAGE.alt })
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", IMAGE.src)

    const original = within(dialog).getByRole("link", { name: /imagem original/i })
    expect(original).toHaveAttribute("href", IMAGE.original)
    expect(original).toHaveAttribute("target", "_blank")

    await user.keyboard("{Escape}")

    // jsdom fires no transitionend, so the popup stays mounted with Base UI's
    // closed state instead of unmounting: `data-closed` is the close signal here.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toHaveAttribute("data-closed")
    })
    expect(trigger).toHaveFocus()
  })

  it("zooms in, out and back to the original size", async () => {
    const user = userEvent.setup()
    renderFigure()

    await user.click(screen.getByRole("button", { name: `Ampliar figura: ${IMAGE.alt}` }))
    const dialog = await screen.findByRole("dialog", { name: IMAGE.alt })
    const image = within(dialog).getByRole("img")

    expect(image).toHaveAttribute("data-zoom", "1")

    await user.click(within(dialog).getByRole("button", { name: /aumentar zoom/i }))
    expect(within(dialog).getByRole("img")).toHaveAttribute("data-zoom", "1.5")

    await user.click(within(dialog).getByRole("button", { name: /reduzir zoom/i }))
    expect(within(dialog).getByRole("img")).toHaveAttribute("data-zoom", "1")
  })

  it("does not render a figure when the image is not in the manifest", () => {
    const { container } = render(
      <MemoryRouter>
        <MarkdownRenderer markdown="![Sem manifesto](/media/zzz/1280.webp)" />
      </MemoryRouter>,
    )

    const img = container.querySelector("figure img")
    expect(img).not.toBeNull()
    expect(img).not.toHaveAttribute("width")
  })
})
