import { chromium } from "playwright"
const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"
const b = await chromium.launch()
for (const [name, path, w, h, scheme, scroll] of [
  ["cover-dsa-desktop", "/g/dsa", 1440, 900, "light", 700],
  ["cover-dsa-mobile", "/g/dsa", 390, 844, "dark", 500],
  ["cover-aluminio-mobile", "/g/aluminio", 390, 844, "light", 400],
  ["chapter-dsa-anchor", "/g/dsa/c/01-restate-and-decompose#11-problem-solving-habits", 1440, 900, "light", 0],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2, isMobile: w < 500, hasTouch: w < 500 })
  const p = await ctx.newPage()
  await p.goto(BASE + path, { waitUntil: "networkidle" })
  if (scroll) { await p.evaluate((y) => window.scrollTo(0, y), scroll); await p.waitForTimeout(500) }
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${OUT}/${name}.png` })
  const info = await p.evaluate(() => ({
    links: document.querySelectorAll("main a[href^='/g/']").length,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  console.log(name, JSON.stringify(info))
  await ctx.close()
}
await b.close()
