import { currentCompletions, startCompletion } from "@codemirror/autocomplete"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createSlashCommandsExtension, filterSlashCommands } from "./slash-commands"

let mountedView: EditorView | null = null

describe("filterSlashCommands", () => {
  afterEach(() => {
    mountedView?.destroy()
    mountedView?.dom.parentElement?.remove()
    mountedView = null
  })

  it("fuzzy-matches Obsidian-style slash commands for math, callouts and blocks", () => {
    const mathBlock = filterSlashCommands("mb")
    expect(mathBlock[0]?.id).toBe("math-block")

    const inlineMath = filterSlashCommands("inl")
    expect(inlineMath[0]?.id).toBe("inline-math")

    const proof = filterSlashCommands("proof")
    expect(proof[0]?.id).toBe("callout-proof")

    const theorem = filterSlashCommands("teor")
    expect(theorem[0]?.id).toBe("callout-theorem")

    expect(filterSlashCommands("zzzzunlikely")).toEqual([])
  })

  it("re-filters live in CodeMirror as characters are typed after /", async () => {
    const parent = document.createElement("div")
    document.body.appendChild(parent)
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "",
        extensions: [createSlashCommandsExtension()],
      }),
    })
    mountedView = view

    // Typing `/` triggers the slash dropdown.
    view.dispatch({
      changes: { from: 0, insert: "/", to: 0 },
      selection: { anchor: 1 },
      userEvent: "input.type",
    })
    startCompletion(view)
    await waitFor(() => {
      expect(currentCompletions(view.state).length).toBeGreaterThan(3)
    })
    const initialCount = currentCompletions(view.state).length

    // Typing `inl` after `/` synchronously re-filters the dropdown to Inline math.
    view.dispatch({
      changes: { from: 1, insert: "inl", to: 1 },
      selection: { anchor: 4 },
      userEvent: "input.type",
    })
    const filtered = currentCompletions(view.state)
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.length).toBeLessThan(initialCount)
    expect(filtered[0]?.label).toBe("Inline math")
  })
})
