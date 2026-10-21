// Captures the guides added in the ResMat + Calculo Numerico batch: home, shelf
// grid, a long review guide, a theory chapter with math and figures, and the
// mobile reading layout. Prints the counts that prove the pages are populated.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "http://127.0.0.1:8099"
const OUT = process.env.OUT ?? "/home/carloshnp/.hermes/cache/scratch/shots"

const browser = await chromium.launch()

async function shot(path, file, width = 1440, height = 1000) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(String(error)))
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  // figures below the fold are lazy: walk the page so they load before measuring
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(600)
  const stats = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      guides: document.querySelectorAll("[data-slot='guide-card'], [data-slot='guide-row']").length,
      chapters: document.querySelectorAll("[data-slot='chapter-list'] a").length,
      headings: document.querySelectorAll("article h2, article h3").length,
      figures: document.querySelectorAll("article img").length,
      brokenImages: [...document.querySelectorAll("article img")].filter(
        (img) => !img.complete || img.naturalWidth === 0,
      ).length,
      math: document.querySelectorAll(".katex").length,
      hasIndex: /^\s*Índice\s*$/m.test(text),
      hasMetadata: /Gerado em:|Nível:|Disciplina:/i.test(text),
      scrollW: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      firstHeading: document.querySelector("h1")?.innerText?.slice(0, 90) ?? null,
    }
  })
  console.log(path, JSON.stringify({ ...stats, errors }))
  await page.screenshot({ path: `${OUT}/${file}` })
  await context.close()
}

await shot("/", "new-home.png", 1440, 1200)
await shot("/estantes", "new-estantes.png", 1440, 1200)
await shot("/g/resmat-p1", "new-resmat-p1.png", 1440, 1400)
await shot("/g/resmat-p1/c/01-o-formulario-da-p1-e-o-que-ele-nao-traz", "new-resmat-p1-chapter.png")
await shot("/g/isostatica/c/01-grandezas-fundamentais-e-unidades", "new-isostatica-chapter.png")
await shot("/g/torcao/c/06-secoes-compostas-dois-materiais-no-mesmo-eixo", "new-torcao-chapter.png")
await shot("/g/cn-contorno/c/09-exemplo-resolvido-com-dirichlet-n-3", "new-cn-contorno-chapter.png")
await shot("/g/isostatica/c/01-grandezas-fundamentais-e-unidades", "new-isostatica-mobile.png", 390, 844)

await browser.close()
