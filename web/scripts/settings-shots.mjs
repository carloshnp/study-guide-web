// Captures the settings menu in both width modes, plus the two ends of the new
// 40-150px margin range, and prints the measured geometry for each state.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"
const CHAPTER = "/g/aluminio/c/13-diagramas-de-equilibrio-ternarios-al-cu-mg"

const browser = await chromium.launch()

async function open(prefs) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  if (prefs) {
    await context.addInitScript((value) => {
      window.localStorage.setItem("estudos-layout", JSON.stringify(value))
    }, prefs)
  }
  const page = await context.newPage()
  await page.goto(BASE + CHAPTER, { waitUntil: "networkidle" })
  await page.waitForTimeout(600)
  return { context, page }
}

async function measure(page) {
  return page.evaluate(() => {
    const article = document.querySelector("[data-slot='chapter-body'] > article")?.getBoundingClientRect()
    const toc = document.querySelector("[data-slot='chapter-body'] > aside, [data-slot='chapter-body'] > nav")?.getBoundingClientRect()
    return {
      layout: document.documentElement.dataset.layout,
      gutter: getComputedStyle(document.documentElement).getPropertyValue("--content-gutter").trim(),
      articleLeft: article ? Math.round(article.left) : null,
      articleRight: article ? Math.round(article.right) : null,
      tocRight: toc ? Math.round(toc.right) : null,
    }
  })
}

// Centred: the menu must not offer a margin.
let { context, page } = await open(null)
await page.getByRole("button", { name: /configurações de leitura/i }).click()
await page.waitForTimeout(400)
console.log("centered-menu", JSON.stringify(await measure(page)))
console.log(
  "centered-menu-has-margin",
  await page.getByText("Margem lateral").count(),
  "reset",
  await page.getByRole("button", { name: /restaurar padrão/i }).count(),
)
await page.screenshot({ path: `${OUT}/settings-centered.png` })
await context.close()

// Full width, default 40px: the margin control appears.
;({ context, page } = await open({ mode: "full", gutter: 40 }))
await page.getByRole("button", { name: /configurações de leitura/i }).click()
await page.waitForTimeout(400)
console.log("full-menu-40", JSON.stringify(await measure(page)))
console.log("full-menu-has-margin", await page.getByText("Margem lateral").count())
await page.screenshot({ path: `${OUT}/settings-full-40.png` })
await context.close()

// Full width at the maximum.
;({ context, page } = await open({ mode: "full", gutter: 150 }))
console.log("full-150", JSON.stringify(await measure(page)))
await page.screenshot({ path: `${OUT}/full-150.png` })
await context.close()

// A stale stored margin below the new minimum must be lifted to 40.
;({ context, page } = await open({ mode: "full", gutter: 12 }))
console.log("full-stale-12", JSON.stringify(await measure(page)))
await context.close()

await browser.close()
