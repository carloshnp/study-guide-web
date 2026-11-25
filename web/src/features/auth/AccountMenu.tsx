/**
 * Account control in the top bar:
 * - Signed out: "Entrar" button opening a coss/ui Login / Criar conta dialog.
 * - Signed in: initials avatar button opening a popover with account info and "Sair".
 */

"use client"

import { LogInIcon, LogOutIcon, UserIcon } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

import { useAuth } from "./AuthContext"

type AuthMode = "login" | "register"

function initialsOf(displayName: string, username: string): string {
  const source = (displayName || username).trim()
  if (!source) return "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function AccountMenu() {
  const auth = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>("login")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openDialog = () => {
    setMode(auth.hasUsers ? "login" : "register")
    setError(null)
    setPassword("")
    setDialogOpen(true)
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === "register") {
        await auth.register({
          displayName: displayName.trim() || undefined,
          password,
          username: username.trim(),
        })
      } else {
        await auth.login({
          password,
          username: username.trim(),
        })
      }
      setDialogOpen(false)
      setUsername("")
      setDisplayName("")
      setPassword("")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setSubmitting(true)
    try {
      await auth.logout()
      setPopoverOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.user) {
    const initials = initialsOf(auth.user.displayName, auth.user.username)
    const roleLabel = auth.user.role === "owner" ? "Proprietário" : "Membro"

    return (
      <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
        <PopoverTrigger
          render={
            <Button
              aria-label={`Conta: ${auth.user.displayName}`}
              className="size-11 rounded-lg px-0 text-muted-foreground hover:text-foreground"
              data-slot="account-trigger"
              size="icon-xl"
              title={`Conta: ${auth.user.displayName}`}
              type="button"
              variant="ghost"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-7 items-center justify-center rounded-full bg-brand/15 text-caption font-bold text-brand"
              >
                {initials}
              </span>
            </Button>
          }
        />

        <PopoverPopup align="end" aria-label="Menu da conta" className="w-64 p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-meta font-semibold text-foreground">
                {auth.user.displayName}
              </p>
              <span className="shrink-0 rounded-chip bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                {roleLabel}
              </span>
            </div>
            <p className="mt-0.5 truncate text-caption text-muted-foreground">
              @{auth.user.username}
            </p>
          </div>

          <div className="p-2">
            <Button
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={submitting}
              onClick={handleLogout}
              type="button"
              variant="ghost"
            >
              <LogOutIcon aria-hidden="true" className="size-4" />
              Sair
            </Button>
          </div>
        </PopoverPopup>
      </Popover>
    )
  }

  return (
    <>
      <Button
        aria-label={auth.hasUsers ? "Entrar" : "Entrar ou criar conta"}
        className="h-11 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
        data-slot="account-signin"
        onClick={openDialog}
        title={auth.hasUsers ? "Entrar" : "Criar conta ou entrar"}
        type="button"
        variant="ghost"
      >
        {auth.hasUsers ? (
          <LogInIcon aria-hidden="true" className="size-4" />
        ) : (
          <UserIcon aria-hidden="true" className="size-4" />
        )}
        <span className="hidden text-meta font-medium sm:inline">Entrar</span>
      </Button>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "register" ? "Criar conta" : "Entrar"}</DialogTitle>
            <DialogDescription>
              {mode === "register"
                ? "Crie seu espaço isolado de anotações, destaques, progresso e flashcards."
                : "Acesse suas anotações, destaques, progresso e flashcards."}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
              <button
                aria-selected={mode === "login"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-meta font-medium transition-colors",
                  mode === "login"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => switchMode("login")}
                role="tab"
                type="button"
              >
                Entrar
              </button>
              <button
                aria-selected={mode === "register"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-meta font-medium transition-colors",
                  mode === "register"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => switchMode("register")}
                role="tab"
                type="button"
              >
                Criar conta
              </button>
            </div>

            {mode === "register" && !auth.hasUsers ? (
              <p className="mb-4 rounded-lg border border-border bg-accent/60 px-3 py-2 text-caption text-accent-foreground">
                A primeira conta registrada assume o papel de proprietário e herda todas as suas
                notas, destaques, progresso e flashcards atuais.
              </p>
            ) : null}

            <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-username">Usuário</Label>
                <Input
                  autoComplete="username"
                  autoFocus
                  id="auth-username"
                  maxLength={40}
                  minLength={3}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="ex.: carlos"
                  required
                  value={username}
                />
              </div>

              {mode === "register" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-display-name">Nome de exibição (opcional)</Label>
                  <Input
                    autoComplete="name"
                    id="auth-display-name"
                    maxLength={80}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Como aparecerá no menu"
                    value={displayName}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-password">Senha</Label>
                <Input
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  id="auth-password"
                  maxLength={128}
                  minLength={mode === "register" ? 8 : 1}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                  required
                  type="password"
                  value={password}
                />
              </div>

              {error ? (
                <p
                  className="rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-caption text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <Button className="mt-1 w-full" disabled={submitting} type="submit">
                {submitting
                  ? "Aguarde…"
                  : mode === "register"
                    ? "Criar conta"
                    : "Entrar"}
              </Button>
            </form>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </>
  )
}
