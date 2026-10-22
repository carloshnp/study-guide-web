// Captures the subfolder feature: home list, covers grid, guide breadcrumb and the
// sidebar with the folder expanded. Prints the structure it measured so a missing
// folder cannot pass as a cosmetic difference.
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "http://127.0.0.1:8099"
const OUT = process.env.OUT ?? "/home/carloshnp/.hermes/cache/scratch/shots"

const browser = await chromium.launch()

async function shot(path, file, { width = 1440, height = 1100, open } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(String(error)))
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  if (open) {
    for (const label of open) {
      const button = page.getByRole("button", { name: new RegExp(label, "i") }).first()
      if ((await button.getAttribute("aria-expanded")) === "false") await button.click()
      await page.waitForTimeout(150)
    }
  }
  const stats = await page.evaluate(() => ({
    folders: [...document.querySelectorAll("h3, h4")]
      .map((node) => node.innerText.trim())
      .filter((text) => text.startsWith("Não-Ferrosos")),
    crumbs: [...document.querySelectorAll("nav[aria-label='Trilha'] span")].map((n) =>
      n.innerText.trim(),
    ),
    sidebarFolders: [...document.querySelectorAll("nav button")]
      .map((node) => node.innerText.trim())
      .filter((text) => text.startsWith("Não-Ferrosos")),
    headings: [...document.querySelectorAll("h2, h3, h4")]
      .slice(0, 14)
      .map((node) => `${node.tagName}: ${node.innerText.trim()}`),
  }))
  console.log(path, JSON.stringify({ ...stats, errors }))
  await page.screenshot({ path: `${OUT}/${file}` })
  await context.close()
}

await shot("/", "folders-home.png", { open: ["Metalurgia"] })
await shot("/estantes", "folders-estantes.png")
await shot("/g/aluminio", "folders-guide.png", { open: ["Metalurgia"] })
await shot("/", "folders-home-mobile.png", { width: 390, height: 844 })

await browser.close()
