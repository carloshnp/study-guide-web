/**
 * Registers the pass-through service worker that makes the site installable
 * ("Instalar app" / "Adicionar à tela inicial"). Production only: in `vite dev` a
 * worker would sit between the dev server and the page for no benefit.
 */
export function registerServiceWorker(
  nav: Pick<Navigator, "serviceWorker"> | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
  isProduction: boolean = import.meta.env.PROD,
): void {
  if (!isProduction || !nav || !("serviceWorker" in nav) || !nav.serviceWorker) return
  const register = () => {
    // An install-only worker is a progressive enhancement; failing to register is silent.
    nav.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined)
  }
  if (document.readyState === "complete") register()
  else window.addEventListener("load", register, { once: true })
}
