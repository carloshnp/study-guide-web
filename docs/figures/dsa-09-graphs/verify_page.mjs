// Verify the published chapter 9 figures in a real browser.
//
// Run from the web/ folder so playwright resolves:
//   cd /home/carloshnp/study-site/web && node ../docs/figures/dsa-09-graphs/verify_page.mjs
//
// Prints one JSON line with the figure count, the loaded and broken image counts, the
// rendered sizes, and writes two screenshots for the visual pass.

import { createRequire } from "node:module"
import { readFileSync, writeFileSync } from "node:fs"

// playwright lives in the site's web workspace; resolve it without adding files there.
const require = createRequire("/home/carloshnp/study-site/web/package.json")
const { chromium } = require("playwright")

const BASE = process.env.BASE ?? "http://127.0.0.1:8080"
const guide = JSON.parse(
  readFileSync(new URL("../../../content/guides/dsa/guide.json", import.meta.url), "utf8"),
)
const chapter = guide.chapters.find((c) => c.number === 9) ?? guide.chapters[8]
const url = `${BASE}/g/dsa/c/${chapter.slug}`

const report = { url, chapter: chapter.slug, figures: 0, loaded: 0, broken: 0, sizes: [] }

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForSelector("figure[data-slot='chapter-figure']", { timeout: 15000 })

  // Lazy images only load when near the viewport: walk the page, then settle.
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(800)

  report.figures = await page.locator("figure[data-slot='chapter-figure']").count()
  const images = page.locator("figure[data-slot='chapter-figure'] img")
  const total = await images.count()
  for (let i = 0; i < total; i += 1) {
    const img = images.nth(i)
    const info = await img.evaluate((node) => ({
      src: node.currentSrc || node.src,
      complete: node.complete,
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      clientWidth: Math.round(node.getBoundingClientRect().width),
      clientHeight: Math.round(node.getBoundingClientRect().height),
      alt: node.alt.slice(0, 80),
    }))
    if (info.complete && info.naturalWidth > 0) report.loaded += 1
    else report.broken += 1
    report.sizes.push(info)
  }

  // Two frames for the visual pass: the first figure and the densest one.
  const first = page.locator("figure[data-slot='chapter-figure']").first()
  await first.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: "/tmp/ch09-desktop-first.png" })

  const target = page.locator("figure[data-slot='chapter-figure']").nth(Math.min(8, total - 1))
  await target.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: "/tmp/ch09-desktop-dijkstra.png" })

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  await phone.goto(url, { waitUntil: "networkidle" })
  await phone.waitForSelector("figure[data-slot='chapter-figure']", { timeout: 15000 })
  const phoneFigure = phone.locator("figure[data-slot='chapter-figure']").nth(2)
  await phoneFigure.scrollIntoViewIfNeeded()
  await phone.waitForTimeout(600)
  await phone.screenshot({ path: "/tmp/ch09-phone-components.png" })
  report.phoneFigureWidth = await phoneFigure
    .locator("img")
    .evaluate((node) => Math.round(node.getBoundingClientRect().width))
} finally {
  await browser.close()
}

writeFileSync("/tmp/ch09-page-report.json", JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  url: report.url,
  figures: report.figures,
  loaded: report.loaded,
  broken: report.broken,
  phoneFigureWidth: report.phoneFigureWidth,
  first: report.sizes[0],
  last: report.sizes[report.sizes.length - 1],
}))
