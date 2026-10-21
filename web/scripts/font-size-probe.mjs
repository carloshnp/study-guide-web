// Verifies the reading-size control end to end: the prose actually changes size,
// the controls stop at the bounds, and the label reads "Auto".
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = "/home/carloshnp/.hermes/cache/scratch/shots"
const CHAPTER = "/g/aluminio/c/13-diagramas-de-equilibrio-ternarios-al-cu-mg"

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await page.goto(BASE + CHAPTER, { waitUntil: "networkidle" })

const prose = () =>
  page.evaluate(() => {
    const p = document.querySelector("[data-slot='reader-prose'] p")
    const h2 = document.querySelector("[data-slot='reader-prose'] h2")
    const root = getComputedStyle(document.documentElement)
    return {
      token: root.getPropertyValue("--reader-size").trim(),
      paragraph: p ? getComputedStyle(p).fontSize : null,
      h2: h2 ? getComputedStyle(h2).fontSize : null,
      articleWidth: Math.round(document.querySelector("[data-slot='chapter-body'] > article")?.getBoundingClientRect().width ?? 0),
      scrollW: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }
  })

console.log("default", JSON.stringify(await prose()))

await page.getByRole("button", { name: /configurações de leitura/i }).click()
await page.waitForTimeout(300)
console.log("theme-labels", await page.getByRole("group", { name: /tema/i }).innerText())
console.log("font-value", await page.locator("[data-slot='font-size-value']").innerText())
await page.screenshot({ path: `${OUT}/settings-font-default.png` })

const grow = page.getByRole("button", { name: /aumentar fonte/i })
const shrink = page.getByRole("button", { name: /diminuir fonte/i })

for (let i = 0; i < 10; i += 1) {
  if (await grow.isDisabled()) break
  await grow.click()
}
console.log("max", JSON.stringify(await prose()))
console.log("max-label", await page.locator("[data-slot='font-size-value']").innerText(), "grow-disabled", await grow.isDisabled())
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/reader-24px.png` })

await page.getByRole("button", { name: /configurações de leitura/i }).click()
await page.waitForTimeout(200)
for (let i = 0; i < 20; i += 1) {
  if (await shrink.isDisabled()) break
  await shrink.click()
}
console.log("min", JSON.stringify(await prose()))
console.log("min-label", await page.locator("[data-slot='font-size-value']").innerText(), "shrink-disabled", await shrink.isDisabled())
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/reader-16px.png` })

// Reload keeps the choice.
await page.reload({ waitUntil: "networkidle" })
console.log("after-reload", JSON.stringify(await prose()))

await context.close()
await browser.close()
