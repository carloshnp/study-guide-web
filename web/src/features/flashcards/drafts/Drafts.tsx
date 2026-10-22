import { useState } from "react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { flashcardsApi, type DraftImportResult, type DraftSummary } from "@/features/flashcards/api"
import { useResource } from "@/features/flashcards/useResource"

function DraftRow({
  draft,
  onImported,
}: {
  draft: DraftSummary
  onImported: (result: DraftImportResult) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importDraft = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await flashcardsApi.importDrafts(draft.file)
      onImported(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao importar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-foreground">{draft.file}</p>
          <p className="text-meta text-muted-foreground">
            {draft.guideId ? `guia ${draft.guideId} · ` : ""}
            {draft.count} {draft.count === 1 ? "card" : "cards"}
            {draft.tags.length > 0 ? ` · ${draft.tags.join(", ")}` : ""}
          </p>
        </div>
        <Button disabled={busy || draft.count === 0} onClick={importDraft} size="sm">
          {busy ? "Importando…" : "Importar"}
        </Button>
      </div>
      {error ? <p className="text-meta text-danger">{error}</p> : null}
    </li>
  )
}

export function Drafts() {
  const resource = useResource("drafts", () => flashcardsApi.listDrafts())
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-8" data-slot="flashcards-drafts">
      <PageHeader
        description="Rascunhos são arquivos YAML com cards prontos, autorados fora do site (piloto Magnésio). Importe para criar as notas e os cards; a importação é idempotente e não duplica."
        kicker="Flashcards"
        title="Rascunhos"
      />

      {resource.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2" data-slot="drafts-loading">
          <span className="sr-only">Carregando rascunhos…</span>
          {[0, 1].map((row) => (
            <div className="h-12 w-full rounded-card bg-code" key={row} />
          ))}
        </div>
      ) : null}

      {resource.status === "error" ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="drafts-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">
            Não foi possível carregar os rascunhos.
          </p>
          <p className="text-meta text-muted-foreground">{resource.error}</p>
          <Button className="w-fit" onClick={resource.reload} size="sm" variant="outline">
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {notice ? (
        <p className="text-meta text-emerald-600" role="status">
          {notice}
        </p>
      ) : null}

      {resource.status === "ready" && (resource.data?.length ?? 0) === 0 ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="drafts-empty"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Nenhum rascunho disponível.</p>
          <p className="text-meta text-muted-foreground">
            Arquivos `.yaml` em `data/flashcards/drafts/` aparecem aqui.
          </p>
        </div>
      ) : null}

      {resource.status === "ready" && (resource.data?.length ?? 0) > 0 ? (
        <ul className="flex max-w-[var(--measure)] flex-col divide-y divide-border border-y border-border">
          {resource.data?.map((draft) => (
            <DraftRow
              draft={draft}
              key={draft.file}
              onImported={(result) => {
                resource.reload()
                setNotice(
                  result.created > 0
                    ? `${result.file}: ${result.created} criados, ${result.skipped} já existiam.`
                    : `${result.file}: nada novo — ${result.skipped} já existiam.`,
                )
              }}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
