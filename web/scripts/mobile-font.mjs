import { chromium } from "playwright"
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" })
await ctx.addInitScript(() => window.localStorage.setItem("estudos-layout", JSON.stringify({ mode: "centered", gutter: 40, fontSize: 24 })))
const p = await ctx.newPage()
await p.goto("https://carloshnp-1.tailfa3301.ts.net/g/aluminio/c/13-diagramas-de-equilibrio-ternarios-al-cu-mg", { waitUntil: "networkidle" })
console.log(JSON.stringify(await p.evaluate(() => {
  const para = document.querySelector("[data-slot='reader-prose'] p")
  return {
    scale: getComputedStyle(document.documentElement).getPropertyValue("--font-scale").trim(),
    paragraph: para ? getComputedStyle(para).fontSize : null,
    scrollW: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    gutter: getComputedStyle(document.documentElement).getPropertyValue("--content-gutter").trim(),
  }
})))
await p.screenshot({ path: "/home/carloshnp/.hermes/cache/scratch/shots/mobile-24px.png" })
await b.close()
