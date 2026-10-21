// Captures the layout settings states from the live server and measures them:
// 1920 default (centred), 1920 full width, the settings popover, and a 390 phone
// with an extreme margin stored, which must still render at the phone gutter.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"
const CHAPTER = "/g/aluminio/c/13-diagramas-de-equilibrio-ternarios-al-cu-mg"

const browser = await chromium.launch()

async function open(width, height, scheme, prefs) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 2, isMobile: width < 500, hasTouch: width < 500 })
  if (prefs) {
    await context.addInitScript((value) => {
      window.localStorage.setItem("estudos-layout", JSON.stringify(value))
    }, prefs)
  }
  const page = await context.newPage()
  await page.goto(BASE + CHAPTER, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)
  return { context, page }
}

async function measure(page) {
  return page.evaluate(() => {
    const column = document.querySelector("[data-slot='content-column']")
    const rect = column?.getBoundingClientRect()
    const root = getComputedStyle(document.documentElement)
    return {
      layout: document.documentElement.dataset.layout,
      maxWidth: root.getPropertyValue("--content-max").trim(),
      gutter: root.getPropertyValue("--content-gutter").trim(),
      column: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null,
      article: (() => {
        const el = document.querySelector("[data-slot='chapter-body'] > article")
        const r = el?.getBoundingClientRect()
        return r ? { left: Math.round(r.left), right: Math.round(r.right) } : null
      })(),
      toc: (() => {
        const el = document.querySelector("[data-slot='chapter-body'] > aside, [data-slot='chapter-body'] > nav")
        const r = el?.getBoundingClientRect()
        return r ? { left: Math.round(r.left), right: Math.round(r.right) } : null
      })(),
      viewport: window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
    }
  })
}

// 1. Default at 1920: centred, equal margins both sides of the content column.
let { context, page } = await open(1920, 1080, "light")
console.log("centered-1920", JSON.stringify(await measure(page)))
await page.screenshot({ path: `${OUT}/layout-centered-1920.png` })
await context.close()

// 2. Full width at 1920.
;({ context, page } = await open(1920, 1080, "light", { mode: "full", gutter: 24 }))
console.log("full-1920", JSON.stringify(await measure(page)))
await page.screenshot({ path: `${OUT}/layout-full-1920.png` })
await context.close()

// 3. Settings popover open, 1440.
;({ context, page } = await open(1440, 900, "light"))
await page.getByRole("button", { name: /configurações de leitura/i }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/layout-settings-open.png` })
await context.close()

// 4. Phone with a 96px margin stored: the phone gutter must win.
;({ context, page } = await open(390, 844, "dark", { mode: "centered", gutter: 96 }))
console.log("phone-with-96", JSON.stringify(await measure(page)))
await page.screenshot({ path: `${OUT}/layout-phone-96.png` })
await context.close()

await browser.close()
