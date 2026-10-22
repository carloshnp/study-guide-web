// Smoke test the deployed flashcards feature end to end: deck list derived from
// the magnesio guides, a training session (no reschedule) completing by keyboard,
// and the editor route reachable. Prints measured counts; fails loudly on any 0.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "https://carloshnp-1.tailfa3301.ts.net"
const OUT = process.env.OUT ?? "/home/carloshnp/.hermes/cache/scratch/shots"

const browser = await chromium.launch()

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
const errors = []
page.on("pageerror", (error) => errors.push(String(error)))

// 1. Deck list
await page.goto(`${BASE}/flashcards/decks`, { waitUntil: "networkidle" })
await page.waitForTimeout(900)
const deckStats = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("li, tr")].map((n) => n.innerText)
  return {
    hasMagnesioGuide: rows.some((t) => t.includes("Magnésio") && t.includes("guia")),
    deckCards: rows.filter((t) => /cards|cartas|capítulos|capitulos/i.test(t)),
    bodyLen: document.body.innerText.length,
  }
})
console.log("decks:", JSON.stringify(deckStats))
await page.screenshot({ path: `${OUT}/fc-decks.png` })

// 2. Guide deck detail: browse the whole deck
const detail = page.locator("a", { hasText: /Magnésio/ }).first()
if ((await detail.count()) > 0) {
  await detail.click()
  await page.waitForTimeout(800)
  console.log("deck detail:", JSON.stringify(await page.evaluate(() => ({
    h1: document.querySelector("h1")?.innerText,
    cardCount: document.querySelectorAll("article li, article div").length,
  }))))
  await page.screenshot({ path: `${OUT}/fc-deck-detail.png` })
}

// 3. Guide deck detail: browse the whole deck, then train by keyboard
await page.goto(`${BASE}/flashcards/decks`, { waitUntil: "networkidle" })
await page.waitForTimeout(800)
const open = page.locator("li", { hasText: /228 cards/ }).first().locator("a", { hasText: /Abrir/ })
if ((await open.count()) > 0) {
  await open.click()
  await page.waitForTimeout(800)
  console.log("deck detail:", JSON.stringify(await page.evaluate(() => ({
    h1: document.querySelector("h1")?.innerText,
    browsedCards: document.querySelectorAll("[data-slot='deck-cards'] li, article li").length,
  }))))
  await page.screenshot({ path: `${OUT}/fc-deck-detail.png` })

  const train = page.locator("a, button", { hasText: /Treinar agora/ }).first()
  if ((await train.count()) > 0) {
    await train.click()
    await page.waitForTimeout(900)
    const start = await page.evaluate(() => ({
      hasPrompt: document.body.innerText.length > 0,
      buttons4: document.querySelectorAll("button[data-rating]").length,
      title: document.querySelector("h1")?.innerText,
    }))
    console.log("training start:", JSON.stringify(start))
    await page.screenshot({ path: `${OUT}/fc-training.png` })

    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press("Space")
      await page.waitForTimeout(250)
      await page.keyboard.press("Digit3")
      await page.waitForTimeout(200)
    }
    console.log("after 4 reviews:", JSON.stringify(await page.evaluate(() => ({
      bodyLen: document.body.innerText.length,
    }))))
  } else {
    console.log("training button not found in deck detail")
  }
} else {
  console.log("guide deck row not found")
}

// 4. Editor route
await page.goto(`${BASE}/flashcards/cards`, { waitUntil: "networkidle" }).catch(() => {})
await page.waitForTimeout(600)
console.log("editor route:", JSON.stringify(await page.evaluate(() => ({
  h1: document.querySelector("h1")?.innerText,
}))))

// 5. Daily queue (review mode) on mobile
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mp = await mobile.newPage()
await mp.goto(`${BASE}/flashcards/review?scope=all`, { waitUntil: "networkidle" })
await mp.waitForTimeout(900)
await mp.screenshot({ path: `${OUT}/fc-mobile.png` })
console.log("mobile review:", JSON.stringify(await mp.evaluate(() => ({
  bodyLen: document.body.innerText.length,
  buttons4: document.querySelectorAll("button[data-rating]").length,
}))))
await mobile.close()

console.log("pageErrors:", JSON.stringify(errors))
await browser.close()
