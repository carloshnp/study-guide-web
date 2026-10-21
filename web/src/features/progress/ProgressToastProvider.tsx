/**
 * Toast host for progress/notes feedback.
 *
 * `useProgress` raises a toast through the shared `toastManager` when a write
 * fails; that manager needs a `ToastProvider` mounted once above the page.
 * `main.tsx` is owned by the shell, so this provider is exported here for the
 * reader route (or the app root) to mount as `<ProgressToastProvider>`.
 */

"use client"

import type { ReactNode } from "react"

import { ToastProvider } from "@/components/ui/toast"

export function ProgressToastProvider({ children }: { children: ReactNode }) {
  return <ToastProvider position="bottom-center">{children}</ToastProvider>
}
