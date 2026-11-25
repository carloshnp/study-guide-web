import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"
import { studyNotesApi } from "./api"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  })
}

describe("studyNotesApi", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lists notes with optional guide/chapter/section query filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        notes: [
          {
            createdAt: "2026-11-24T12:00:00Z",
            excerpt: "Resumo...",
            id: 7,
            links: [{ chapterId: "02-dist", guideId: "torcao", sectionId: "sec-1" }],
            title: "Nota de Torção",
            updatedAt: "2026-11-24T12:05:00Z",
          },
        ],
      }),
    )

    const notes = await studyNotesApi.listStudyNotes({
      chapterId: "02-dist",
      guideId: "torcao",
      sectionId: "sec-1",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study-notes?guideId=torcao&chapterId=02-dist&sectionId=sec-1",
      expect.objectContaining({ method: "GET" }),
    )
    expect(notes).toHaveLength(1)
    expect(notes[0].links[0]).toEqual({
      chapterId: "02-dist",
      guideId: "torcao",
      sectionId: "sec-1",
    })
  })

  it("creates, updates, fetches, and deletes a standalone note", async () => {
    const sample = {
      body: "Conteúdo",
      createdAt: "2026-11-24T12:00:00Z",
      id: 3,
      links: [],
      title: "Laplace",
      updatedAt: "2026-11-24T12:00:00Z",
    }
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(sample, 201))
      .mockResolvedValueOnce(jsonResponse({ ...sample, title: "Laplace 2" }, 200))
      .mockResolvedValueOnce(jsonResponse({ ...sample, title: "Laplace 2" }, 200))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const created = await studyNotesApi.createStudyNote({ body: "Conteúdo", title: "Laplace" })
    expect(created.id).toBe(3)

    const updated = await studyNotesApi.updateStudyNote(3, {
      body: "Conteúdo",
      title: "Laplace 2",
    })
    expect(updated.title).toBe("Laplace 2")

    const loaded = await studyNotesApi.getStudyNote(3)
    expect(loaded.title).toBe("Laplace 2")

    await studyNotesApi.deleteStudyNote(3)
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/study-notes/3",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("raises ApiError on server failures or malformed responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "Nota não encontrada." }, 404))
      .mockResolvedValueOnce(jsonResponse({ unexpected: true }, 200))

    await expect(studyNotesApi.getStudyNote(999)).rejects.toMatchObject({
      message: "Nota não encontrada.",
      name: "ApiError",
      status: 404,
    })

    await expect(studyNotesApi.listStudyNotes()).rejects.toBeInstanceOf(ApiError)
  })
})
