// Proves the cover index actually navigates: clicks one chapter entry on the
// alumínio cover and one sub-section entry on the DSA cover, then checks the URL,
// the heading and that a section anchor scrolls into view.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const report = {}

async function coverStats(guide) {
  await page.goto(`${BASE}/g/${guide}`, { waitUntil: "networkidle" })
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("main a[href]"))
    const internal = links.filter((a) => a.getAttribute("href")?.startsWith("/g/"))
    const dead = links.filter((a) => (a.getAttribute("href") ?? "").startsWith("#"))
    return { all: links.length, internal: internal.length, deadAnchors: dead.length }
  })
}

report.aluminioCover = await coverStats("aluminio")
await page.getByRole("link", { name: "O alumínio como metal de engenharia", exact: true }).first().click()
await page.waitForURL(/\/g\/aluminio\/c\//)
await page.waitForLoadState("networkidle")
report.aluminioChapter = {
  url: new URL(page.url()).pathname,
  h1: (await page.locator("h1").first().innerText()).trim(),
  hasMathOrText: (await page.locator("h1").first().innerText()).includes("alumínio"),
}

report.dsaCover = await coverStats("dsa")
await page.getByRole("link", { name: /1\.1 Problem-solving habits/i }).first().click()
await page.waitForURL(/\/g\/dsa\/c\/.*#/)
await page.waitForTimeout(900)
report.dsaSection = await page.evaluate(() => {
  const id = decodeURIComponent(location.hash.slice(1))
  const target = document.getElementById(id)
  const rect = target?.getBoundingClientRect()
  return {
    hash: location.hash,
    path: location.pathname,
    targetFound: Boolean(target),
    targetText: target?.textContent?.trim().slice(0, 60) ?? null,
    inViewport: rect ? rect.top >= -50 && rect.top < window.innerHeight : false,
  }
})

await page.screenshot({ path: "/home/carloshnp/.hermes/cache/scratch/shots/cover-index-click.png" })
console.log(JSON.stringify(report, null, 1))
await browser.close()
