import { Link } from "react-router"

import { PageHeader } from "@/components/layout/PageHeader"

/** 404 for unknown routes. Keeps the shell, names the problem, offers one way back. */
export function NotFound() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="404"
        title="Página não encontrada"
        description="O endereço não corresponde a nenhum guia, capítulo ou estante publicada."
      />
      <p className="text-meta">
        <Link to="/" className="font-semibold text-brand underline-offset-4 hover:underline">
          Voltar para o início
        </Link>
      </p>
    </div>
  )
}
