// Captures the four states the closing visual check looks at, from the live
// service on 127.0.0.1:8080 (uvicorn + published build), not from a dev server.
import { chromium } from "playwright"

const BASE = "http://127.0.0.1:8080"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"

const states = [
  { name: "home-desktop-light", path: "/", width: 1440, height: 900, scheme: "light" },
  { name: "chapter-desktop-light", path: "/g/magnesio/c/04-mecanismos-de-endurecimento", width: 1440, height: 900, scheme: "light", scroll: 1400 },
  { name: "home-mobile-dark", path: "/", width: 390, height: 844, scheme: "dark" },
  { name: "chapter-mobile-dark", path: "/g/dsa/c/02-pseudocode-and-invariants", width: 390, height: 844, scheme: "dark", scroll: 1200 },
]

const browser = await chromium.launch()
for (const state of states) {
  const context = await browser.newContext({
    viewport: { width: state.width, height: state.height },
    colorScheme: state.scheme,
    deviceScaleFactor: 2,
    isMobile: state.width < 500,
    hasTouch: state.width < 500,
  })
  const page = await context.newPage()
  await page.goto(BASE + state.path, { waitUntil: "networkidle" })
  if (state.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), state.scroll)
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${state.name}.png` })
  const info = await page.evaluate(() => ({
    headings: document.querySelectorAll("h1,h2,h3,h4").length,
    katex: document.querySelectorAll(".katex").length,
    figures: document.querySelectorAll("figure img").length,
    tables: document.querySelectorAll("table").length,
    checks: document.querySelectorAll("[role=checkbox], input[type=checkbox]").length,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  console.log(state.name, JSON.stringify(info))
  await context.close()
}
await browser.close()
