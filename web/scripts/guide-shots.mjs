// Captures a guide page after the cover trim, plus the counts that prove the
// duplication is gone: no metadata block, no index list, chapters still listed.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"

const browser = await chromium.launch()

async function shot(guide, file, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto(`${BASE}/g/${guide}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  const stats = await page.evaluate(() => {
    const text = document.body.innerText
    const cover = document.querySelector("[data-slot='guide-cover']")
    return {
      hasCoverSection: cover !== null,
      coverText: cover ? cover.innerText.slice(0, 120) : null,
      hasIndexHeading: /Índice|Table of contents/i.test(text),
      hasMetadata: /Gerado em:|Nível:|Disciplina:/i.test(text),
      chapterLinks: document.querySelectorAll("[data-slot='chapter-list'] a").length,
      firstHeading: document.querySelector("h1")?.innerText ?? null,
    }
  })
  console.log(guide, JSON.stringify(stats))
  await page.screenshot({ path: `${OUT}/${file}` })
  await context.close()
}

await shot("titanio", "guide-titanio.png")
await shot("llm-l0l1", "guide-llm.png")
await shot("dsa", "guide-dsa.png")
await shot("aluminio", "guide-aluminio.png", 1920)

await browser.close()
