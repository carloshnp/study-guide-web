import { describe, expect, it } from "vitest"

import { dropPinnedFigures } from "./drop-pinned-figures"

const PINNED = ["Infográfico 3.1 Por que centésimos de porcento já mudam a dureza"]

describe("dropPinnedFigures", () => {
  it("removes the standalone copy of a picture the pinned pane already shows", () => {
    const markdown = [
      "### 3.1 Por que centésimos de porcento já mudam a dureza",
      "",
      "O oxigênio endurece o titânio.",
      "",
      "![Infográfico 3.1 Por que centésimos de porcento já mudam a dureza](/media/abc/1280.webp)",
      "",
      "Depois, a norma fixa o teto.",
    ].join("\n")

    const result = dropPinnedFigures(markdown, PINNED)

    expect(result).not.toContain("/media/abc/1280.webp")
    expect(result).toContain("O oxigênio endurece o titânio.")
    expect(result).toContain("Depois, a norma fixa o teto.")
  })

  it("keeps pictures whose alt text is not pinned", () => {
    const markdown = "![Quatro diagramas de fase (Fig. 9-4)](/media/fig/1280.webp)"

    expect(dropPinnedFigures(markdown, PINNED)).toBe(markdown)
  })

  it("returns the markdown unchanged when nothing is pinned", () => {
    const markdown = "![Infográfico 3.1 Por que centésimos de porcento já mudam a dureza](/media/abc/1280.webp)"

    expect(dropPinnedFigures(markdown, [])).toBe(markdown)
  })

  it("leaves an image written inside a code fence alone", () => {
    const markdown = [
      "```",
      "![Infográfico 3.1 Por que centésimos de porcento já mudam a dureza](/media/abc/1280.webp)",
      "```",
    ].join("\n")

    expect(dropPinnedFigures(markdown, PINNED)).toBe(markdown)
  })

  it("keeps an image that shares a paragraph with prose", () => {
    const markdown =
      "Veja ![Infográfico 3.1 Por que centésimos de porcento já mudam a dureza](/media/abc/1280.webp) aqui."

    expect(dropPinnedFigures(markdown, PINNED)).toBe(markdown)
  })

  it("matches the alt text regardless of extra spaces", () => {
    const markdown =
      "![Infográfico 3.1   Por que centésimos de porcento já mudam a dureza](/media/abc/1280.webp)"

    expect(dropPinnedFigures(markdown, PINNED)).not.toContain("/media/abc/1280.webp")
  })
})
