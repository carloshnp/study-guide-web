/**
 * One settings entry in the top bar, replacing the bare theme-cycle icon.
 *
 * The popover holds what a reader actually adjusts while reading: the theme, the
 * reading size, the reading view (continuous text, or the section picture pinned
 * beside it), whether the panel spans the whole width, and how much side margin
 * the panel keeps. Each control writes straight to its store (theme provider for
 * the theme, the layout store for width and margin), so nothing needs a save
 * button and a reload keeps the choice.
 *
 * The trigger keeps a 44px target and an accessible name that changes with the
 * popover state; every control inside carries a visible label, because a settings
 * pane made of unlabelled sliders is not a setting.
 */

"use client"

import { MinusIcon, PlusIcon, SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FONT_SIZE, GUTTER, useLayout } from "@/features/preferences/layout"
import { THEME_LABEL, type ThemeChoice } from "@/lib/theme"
import { useTheme } from "@/lib/theme-provider"

const THEME_ORDER: ThemeChoice[] = ["auto", "light", "dark"]

export function SettingsMenu() {
  const theme = useTheme()
  const layout = useLayout()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xl"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Configurações de leitura"
            title="Configurações de leitura"
          >
            <SettingsIcon aria-hidden="true" />
          </Button>
        }
      />

      <PopoverPopup
        align="end"
        className="w-[min(92vw,340px)] p-0"
        aria-label="Configurações de leitura"
      >
        <div className="border-b border-border px-4 py-3">
          <PopoverTitle className="text-base">Configurações</PopoverTitle>
          <PopoverDescription className="mt-1 text-meta">
            Aparência, leitura e largura do painel
          </PopoverDescription>
        </div>

        <div className="flex flex-col gap-5 px-4 py-4">
          <section className="flex flex-col gap-2" aria-labelledby="config-tema">
            <p className="text-kicker uppercase text-muted-foreground" id="config-tema">
              Tema
            </p>
            <ToggleGroup
              aria-label="Tema"
              className="w-full"
              value={[theme.choice]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                if (typeof next === "string" && THEME_ORDER.includes(next as ThemeChoice)) {
                  theme.setChoice(next as ThemeChoice)
                }
              }}
            >
              {THEME_ORDER.map((choice) => (
                <ToggleGroupItem
                  key={choice}
                  className="flex-1"
                  value={choice}
                  aria-label={`Tema ${THEME_LABEL[choice].toLowerCase()}`}
                >
                  {THEME_LABEL[choice]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-kicker uppercase text-muted-foreground" id="config-fonte">
              Tamanho da fonte
            </p>
            <div
              className="flex items-center justify-between gap-3"
              role="group"
              aria-labelledby="config-fonte"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Diminuir fonte"
                disabled={!layout.canShrinkFont}
                onClick={() => layout.setFontSize(layout.fontSize - FONT_SIZE.step)}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <span
                className="text-body font-semibold tabular-nums text-foreground"
                data-slot="font-size-value"
                aria-live="polite"
              >
                {`${layout.fontSize} px`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Aumentar fonte"
                disabled={!layout.canGrowFont}
                onClick={() => layout.setFontSize(layout.fontSize + FONT_SIZE.step)}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </div>
            <p className="text-caption text-faint">
              Aumenta ou diminui todo o texto do site, de {FONT_SIZE.min} a {FONT_SIZE.max} px.
            </p>
          </section>

          <section className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-body font-medium" htmlFor="config-imagem-fixa">
                Imagem fixa por subcapítulo
              </label>
              <p className="text-meta text-muted-foreground" id="config-imagem-fixa-ajuda">
                {layout.isPinnedView
                  ? "A imagem do subcapítulo fica fixa (acima do texto no celular, à esquerda no computador) e muda conforme você rola. O painel usa toda a largura."
                  : "Leitura só com o texto, em coluna contínua."}
              </p>
              <p className="text-caption text-faint">
                Vale só para capítulos que têm uma imagem por subcapítulo.
              </p>
            </div>
            <Switch
              id="config-imagem-fixa"
              aria-describedby="config-imagem-fixa-ajuda"
              checked={layout.isPinnedView}
              onCheckedChange={(checked) => layout.setReaderView(checked ? "pinned" : "classic")}
            />
          </section>

          <section className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-body font-medium" htmlFor="config-largura">
                Largura total do painel
              </label>
              <p className="text-meta text-muted-foreground" id="config-largura-ajuda">
                {layout.isFullWidth
                  ? "O texto ocupa todo o painel, até o sumário. Linhas mais longas."
                  : "Centralizado, com largura de leitura confortável."}
              </p>
            </div>
            <Switch
              id="config-largura"
              aria-describedby="config-largura-ajuda"
              checked={layout.isFullWidth}
              onCheckedChange={(checked) => layout.setMode(checked ? "full" : "centered")}
            />
          </section>

          {layout.isFullWidth ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <label className="text-body font-medium" htmlFor="config-margem">
                  Margem lateral
                </label>
                <span
                  className="text-meta tabular-nums text-muted-foreground"
                  data-slot="gutter-value"
                >
                  {`${layout.gutter} px`}
                </span>
              </div>
              <Slider
                id="config-margem"
                aria-label="Margem lateral em pixels"
                getAriaLabel={() => "Margem lateral"}
                max={GUTTER.max}
                min={GUTTER.min}
                step={GUTTER.step}
                value={[layout.gutter]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (typeof next === "number") layout.setGutter(next)
                }}
              />
              <p className="text-caption text-faint">
                No telefone a margem fica fixa em 20 px.
              </p>
            </section>
          ) : null}

        </div>
      </PopoverPopup>
    </Popover>
  )
}
