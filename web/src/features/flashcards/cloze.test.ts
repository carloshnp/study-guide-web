import { describe, expect, it } from "vitest"

import {
  answerForCard,
  clozeAnswerMarkdown,
  clozeBlankCount,
  clozeIndexFromTemplate,
  clozePreview,
  clozeQuestionMarkdown,
  hasCloze,
  parseCloze,
  questionForCard,
} from "./cloze"

describe("cloze parsing", () => {
  it("finds every lacuna in order and keeps the surrounding text", () => {
    const parsed = parseCloze("A {{c2::cementita}} na {{c1::ferrita}} é dura.")

    expect(parsed.blanks.map((blank) => blank.index)).toEqual([1, 2])
    expect(parsed.blanks.map((blank) => blank.answer)).toEqual(["ferrita", "cementita"])
    expect(parsed.parts.map((part) => part.type)).toEqual(["text", "blank", "text", "blank", "text"])
  })

  it("keeps an optional hint and trims the answer", () => {
    const parsed = parseCloze("Solubilidade {{c1::  máxima ::em % }}")

    expect(parsed.blanks[0]).toEqual({ answer: "máxima", hint: "em %", index: 1 })
  })

  it("counts distinct lacunas once even when the index repeats", () => {
    const source = "{{c1::A}} e {{c1::A}} de novo"
    expect(clozeBlankCount(source)).toBe(1)
    expect(parseCloze(source).parts).toHaveLength(4)
  })

  it("reports whether a text is a valid cloze source", () => {
    expect(hasCloze("{{c1::x}}")).toBe(true)
    expect(hasCloze("sem lacunas")).toBe(false)
    expect(clozeBlankCount("sem lacunas")).toBe(0)
  })
})

describe("cloze rendering", () => {
  it("hides the answer in the question and reveals it in the answer", () => {
    const source = "A camada é {{c1::ferrita}} e {{c2::cementita}}."

    expect(clozeQuestionMarkdown(source)).toContain("**[…]**")
    expect(clozeQuestionMarkdown(source)).not.toContain("ferrita")
    expect(clozeAnswerMarkdown(source)).toContain("**ferrita**")
    expect(clozeAnswerMarkdown(source)).toContain("**cementita**")
  })

  it("hides only the lacuna of the card template when asked", () => {
    const source = "A camada é {{c1::ferrita}} e {{c2::cementita}}."

    const question = clozeQuestionMarkdown(source, { hidden: 2 })
    expect(question).toContain("**ferrita**")
    expect(question).toContain("**[…]**")
    expect(question).not.toContain("cementita")
  })

  it("lists the answers for the editor preview", () => {
    expect(clozePreview("{{c1::a}} e {{c2::b}}").answers).toEqual(["a", "b"])
  })

  it("reads the lacuna index out of a card template", () => {
    expect(clozeIndexFromTemplate("cloze:c3")).toBe(3)
    expect(clozeIndexFromTemplate("basic")).toBeNull()
    expect(clozeIndexFromTemplate("reverse")).toBeNull()
  })
})

describe("card rendering helpers", () => {
  it("renders a basic card as is", () => {
    expect(questionForCard({ front: "Frente", kind: "basic", template: "basic" })).toBe("Frente")
    expect(
      answerForCard({ back: "Verso", front: "Frente", kind: "basic", template: "basic" }),
    ).toBe("Verso")
  })

  it("derives the cloze answer even when the queue omits `back`", () => {
    expect(
      answerForCard({
        front: "A camada é {{c1::ferrita}}.",
        kind: "cloze",
        template: "cloze:c1",
      }),
    ).toContain("**ferrita**")
  })

  it("hides only the requested lacuna for a cloze card", () => {
    const question = questionForCard({
      front: "{{c1::A}} e {{c2::B}}",
      kind: "cloze",
      template: "cloze:c2",
    })
    expect(question).toContain("**A**")
    expect(question).toContain("**[…]**")
    expect(question).not.toContain("B")
  })
})
