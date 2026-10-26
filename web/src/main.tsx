import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import "./index.css"
import { registerServiceWorker } from "@/lib/register-sw"
import { ThemeProvider } from "@/lib/theme-provider"
import { router } from "@/router"

const container = document.getElementById("root")
if (!container) throw new Error("index.html is missing #root")

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)

registerServiceWorker()
