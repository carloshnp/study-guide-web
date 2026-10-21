import { chromium } from "playwright"
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } })
await ctx.addInitScript(() => window.localStorage.setItem("estudos-layout", JSON.stringify({ mode: "full", gutter: 24 })))
const p = await ctx.newPage()
await p.goto("https://carloshnp-1.tailfa3301.ts.net/g/aluminio/c/13-diagramas-de-equilibrio-ternarios-al-cu-mg", { waitUntil: "networkidle" })
console.log(JSON.stringify(await p.evaluate(() => {
  const h = document.querySelector("[data-slot='chapter-header']")
  const a = document.querySelector("[data-slot='chapter-body'] > article")
  const r = (el) => el ? { left: Math.round(el.getBoundingClientRect().left), width: Math.round(el.getBoundingClientRect().width), maxW: getComputedStyle(el).maxWidth, justify: getComputedStyle(el.parentElement).justifyContent } : null
  return { header: r(h), article: r(a) }
}), null, 1))
await b.close()
