import { describe, expect, it } from "vitest"

import { coverInitials } from "@/features/catalog/cover-initials"

describe("coverInitials", () => {
  it("takes the initials of the significant words, up to three", () => {
    expect(coverInitials("Estruturas de Dados e Algoritmos")).toBe("EDA")
    expect(coverInitials("Alumínio")).toBe("A")
    expect(coverInitials("Fundamentos para L0 e L1 (LLM)")).toBe("FLL")
  })

  it("always returns something printable", () => {
    expect(coverInitials("de e o")).toBe("?")
  })
})
