import { expect, test } from "@playwright/test"

/**
 * Criterion 1 and 2 of SPEC.md: five guides with the catalogued chapter counts,
 * one JSON document per chapter, and every image the chapters reference served
 * from /media with a 200.
 *
 * Runs once (desktop project) because it is a property of the published tree,
 * not of the viewport.
 */
test.describe("published content", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "content checks run once, on desktop")
  })

  test("index, guide and chapter JSONs exist for every catalogued chapter", async ({
    request,
  }) => {
    const response = await request.get("/content/index.json")
    expect(response.ok()).toBeTruthy()
    const index = (await response.json()) as {
      subjects: { id: string }[]
      guides: { id: string; chapterCount: number }[]
    }

    const expected: Record<string, number> = {
      aluminio: 29,
      "cn-contorno": 25,
      "cn-erros": 18,
      "cn-sistemas": 20,
      "cn-taylor": 12,
      dsa: 12,
      isostatica: 14,
      "llm-l0l1": 14,
      magnesio: 9,
      "resmat-p1": 34,
      "tensao-normal": 14,
      titanio: 16,
      torcao: 9,
    }
    expect(index.guides.map((guide) => guide.id).sort()).toEqual(Object.keys(expected).sort())

    for (const guide of index.guides) {
      expect(guide.chapterCount, `${guide.id} chapterCount`).toBe(expected[guide.id])

      const guideJson = (await (await request.get(`/content/guides/${guide.id}/guide.json`)).json()) as {
        chapters: { slug: string }[]
      }
      expect(guideJson.chapters).toHaveLength(expected[guide.id])

      for (const chapter of guideJson.chapters) {
        const chapterResponse = await request.get(
          `/content/guides/${guide.id}/chapters/${chapter.slug}.json`,
        )
        expect(chapterResponse.status(), `${guide.id}/${chapter.slug}`).toBe(200)
      }
    }
  })

  test("every image referenced by a chapter returns 200 from /media", async ({ request }) => {
    const index = (await (await request.get("/content/index.json")).json()) as {
      guides: { id: string }[]
    }

    let images = 0
    for (const guide of index.guides) {
      const guideJson = (await (await request.get(`/content/guides/${guide.id}/guide.json`)).json()) as {
        chapters: { slug: string }[]
      }
      for (const chapter of guideJson.chapters) {
        const payload = (await (
          await request.get(`/content/guides/${guide.id}/chapters/${chapter.slug}.json`)
        ).json()) as { images?: { src: string; srcset: string }[] }

        for (const image of payload.images ?? []) {
          const media = await request.get(image.src)
          expect(media.status(), image.src).toBe(200)
          expect(media.headers()["content-type"]).toContain("image/webp")
          images += 1

          for (const candidate of image.srcset.split(",").map((entry) => entry.trim().split(" ")[0])) {
            const variant = await request.get(candidate)
            expect(variant.status(), candidate).toBe(200)
            images += 1
          }
        }
      }
    }

    expect(images).toBeGreaterThan(0)
  })

  test("unknown media and unknown API routes are 404, never the SPA shell", async ({ request }) => {
    const media = await request.get("/media/does-not-exist/1280.webp")
    expect(media.status()).toBe(404)

    const api = await request.get("/api/does-not-exist")
    expect(api.status()).toBe(404)
  })
})
