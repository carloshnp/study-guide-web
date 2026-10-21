import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { THEME_LABEL, type ThemeChoice } from "@/lib/theme"
import { useTheme } from "@/lib/theme-provider"

const ICONS: Record<ThemeChoice, LucideIcon> = {
  auto: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
}

/**
 * Cycles auto → light → dark. The accessible name states the current choice and the
 * action, so the control never relies on the icon alone (`aria-labels`, `icon-context`).
 * 44px square on touch surfaces (`touch-target-size`).
 */
export function ThemeToggle() {
  const { choice, cycle } = useTheme()
  const Icon = ICONS[choice]
  const label = `Tema: ${THEME_LABEL[choice]}. Alternar tema`

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xl"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:text-foreground"
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
