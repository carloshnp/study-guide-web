import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import type { ChapterImage } from "@/lib/content"
import { PinnedImagePane } from "./PinnedImagePane"

const FIRST: ChapterImage = {
  alt: "Diagrama de fases do Ti-6Al-4V",
  height: 720,
  original: "/media/aaa/original.jpg",
  src: "/media/aaa/1280.webp",
  srcset: "/media/aaa/640.webp 640w, /media/aaa/1280.webp 1280w, /media/aaa/1920.webp 1920w",
  width: 1280,
}
const SECOND: ChapterImage = { ...FIRST, alt: "Curva de resfriamento", src: "/media/bbb/1280.webp" }

function Harness({ images }: { images: readonly ChapterImage[] }) {
  const [index, setIndex] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  return (
    <PinnedImagePane
      collapsed={collapsed}
      images={images}
      index={index}
      onCollapsedChange={setCollapsed}
      onIndexChange={setIndex}
      title="3.2 Os quatro diagramas de fase"
    />
  )
}

describe("PinnedImagePane", () => {
  it("shows the picture with its alt text and the section title", () => {
    render(<Harness images={[FIRST]} />)

    const image = screen.getByRole("img", { name: FIRST.alt })
    expect(image).toHaveAttribute("src", FIRST.src)
    expect(image).toHaveAttribute("srcset", FIRST.srcset ?? "")
    expect(screen.getAllByText("3.2 Os quatro diagramas de fase").length).toBeGreaterThan(0)
  })

  it("has no previous/next buttons for a single picture", () => {
    render(<Harness images={[FIRST]} />)

    expect(screen.queryByRole("button", { name: /imagem anterior/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /próxima imagem/i })).toBeNull()
  })

  it("steps through several pictures and stops at both ends", async () => {
    const user = userEvent.setup()
    render(<Harness images={[FIRST, SECOND]} />)

    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /imagem anterior/i })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /próxima imagem/i }))
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: SECOND.alt })).toHaveAttribute("src", SECOND.src)
    expect(screen.getByRole("button", { name: /próxima imagem/i })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /imagem anterior/i }))
    expect(screen.getByRole("img", { name: FIRST.alt })).toBeInTheDocument()
  })

  it("opens the lightbox with the original file link", async () => {
    const user = userEvent.setup()
    render(<Harness images={[FIRST]} />)

    await user.click(screen.getByRole("button", { name: /ampliar imagem/i }))

    const link = await screen.findByRole("link", { name: /abrir imagem original/i })
    expect(link).toHaveAttribute("href", FIRST.original ?? "")
  })

  it("folds and unfolds the picture below the side-by-side layout", async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness images={[FIRST]} />)
    const frame = () => container.querySelector('[data-slot="pinned-image-frame"]')

    expect(frame()).not.toHaveClass("max-xl:hidden")
    await user.click(screen.getByRole("button", { name: /recolher imagem/i }))
    expect(frame()).toHaveClass("max-xl:hidden")
    expect(screen.getByRole("button", { name: /mostrar imagem/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    )

    await user.click(screen.getByRole("button", { name: /mostrar imagem/i }))
    expect(frame()).not.toHaveClass("max-xl:hidden")
  })
})
