import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SectionCheck } from "./SectionCheck"
import { resetProgressStore } from "./useProgress"

const GUIDE = "aluminio"
const CHAPTER = "01-o-aluminio"
const SECTION = "11-obtencao"
const UNIT = `${GUIDE}/${CHAPTER}/${SECTION}`
const TITLE = "1.1 Obtenção e viabilidade comercial"

type FetchCall = { init: RequestInit; url: string }

let calls: FetchCall[] = []
let storedUnits: Record<string, "done" | "review"> = {}

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

function renderCheck() {
  return render(
    <div className="relative">
      <SectionCheck
        chapterSlug={CHAPTER}
        guideId={GUIDE}
        sectionId={SECTION}
        title={TITLE}
      />
    </div>,
  )
}

beforeEach(() => {
  resetProgressStore()
  calls = []
  storedUnits = {}
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ init, url })
      if ((init.method ?? "GET") === "GET") {
        return json({ count: Object.keys(storedUnits).length, guideId: GUIDE, units: storedUnits })
      }
      return json({ ...JSON.parse(String(init.body)), updatedAt: "2026-10-21T02:00:00Z" })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetProgressStore()
})

describe("SectionCheck", () => {
  it("names the control after the section title", async () => {
    renderCheck()
    await act(async () => {
      await Promise.resolve()
    })

    expect(
      screen.getByRole("checkbox", { name: `Marcar "${TITLE}" como lido` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: `Marcar "${TITLE}" para revisão` }),
    ).toBeInTheDocument()
  })

  it("issues one done write and reflects it optimistically", async () => {
    const user = userEvent.setup()
    renderCheck()

    const checkbox = screen.getByRole("checkbox", { name: `Marcar "${TITLE}" como lido` })
    await user.click(checkbox)

    expect(checkbox).toHaveAttribute("aria-checked", "true")
    expect(putCalls()).toHaveLength(1)
    expect(bodyOf(putCalls()[0])).toEqual({
      guideId: GUIDE,
      status: "done",
      unitId: UNIT,
    })
  })

  it("clears the unit when the stored done state is unchecked", async () => {
    storedUnits = { [UNIT]: "done" }
    const user = userEvent.setup()
    renderCheck()

    const checkbox = screen.getByRole("checkbox", { name: `Marcar "${TITLE}" como lido` })
    await waitFor(() => expect(checkbox).toHaveAttribute("aria-checked", "true"))

    await user.click(checkbox)

    expect(checkbox).toHaveAttribute("aria-checked", "false")
    expect(bodyOf(putCalls()[0])).toMatchObject({ status: "absent", unitId: UNIT })
  })

  it("toggles the second state, review, with aria-pressed", async () => {
    const user = userEvent.setup()
    renderCheck()

    const review = screen.getByRole("button", {
      name: `Marcar "${TITLE}" para revisão`,
    })
    expect(review).toHaveAttribute("aria-pressed", "false")

    await user.click(review)

    expect(review).toHaveAttribute("aria-pressed", "true")
    expect(bodyOf(putCalls()[0])).toMatchObject({ status: "review", unitId: UNIT })
  })

  it("keeps a 44px touch target and a 20px desktop gutter", async () => {
    renderCheck()
    await act(async () => {
      await Promise.resolve()
    })

    const wrapper = document.querySelector("[data-slot='section-check']")
    expect(wrapper).not.toBeNull()
    const wrapperClass = wrapper?.className ?? ""
    // Mobile: the control row is at least 44px tall above the heading.
    expect(wrapperClass).toContain("max-md:min-h-11")
    // Desktop: a 20px control pulled into the gutter left of the heading.
    expect(wrapperClass).toContain("md:-start-6")
    expect(wrapperClass).toContain("md:absolute")

    const checkbox = screen.getByRole("checkbox", { name: `Marcar "${TITLE}" como lido` })
    const checkboxClass = checkbox.className
    expect(checkboxClass).toContain("pointer-coarse:after:min-h-11")
    expect(checkboxClass).toContain("pointer-coarse:after:min-w-11")
  })
})
