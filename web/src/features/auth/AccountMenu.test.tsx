import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountMenu } from "./AccountMenu"
import { AuthProvider, useAuth } from "./AuthContext"

function makeResponse(payload: unknown, status = 200) {
  const body = status === 204 ? "" : JSON.stringify(payload)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => body,
  } as unknown as Response
}

function SessionProbe() {
  const { sessionKey } = useAuth()
  return <output data-testid="session-key">{sessionKey}</output>
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("AccountMenu", () => {
  it("registers the first owner account, bumps sessionKey, and signs out cleanly", async () => {
    const user = userEvent.setup()
    const owner = { displayName: "Carlos", id: 1, role: "owner", username: "carlos" }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/auth/me") {
        return makeResponse({ authRequired: false, hasUsers: false, user: null })
      }
      if (url === "/api/auth/register" && init?.method === "POST") {
        return makeResponse({ user: owner }, 201)
      }
      if (url === "/api/auth/logout" && init?.method === "POST") {
        return makeResponse(null, 204)
      }
      return makeResponse({ detail: "Unexpected" }, 500)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <AuthProvider>
        <AccountMenu />
        <SessionProbe />
      </AuthProvider>,
    )

    const initialKey = screen.getByTestId("session-key").textContent
    await user.click(await screen.findByRole("button", { name: /entrar|criar conta/i }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/primeira conta/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^usuário$/i), "carlos")
    await user.type(screen.getByLabelText(/nome de exibição/i), "Carlos")
    await user.type(screen.getByLabelText(/^senha$/i), "minha-senha-123")
    await user.click(screen.getByRole("button", { name: /criar conta$/i }))

    const accountBtn = await screen.findByRole("button", { name: /conta: carlos/i })
    expect(screen.getByTestId("session-key").textContent).not.toBe(initialKey)

    await user.click(accountBtn)
    expect(await screen.findByText("@carlos")).toBeInTheDocument()
    expect(screen.getByText(/proprietário/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /sair/i }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument()
    })
  })

  it("shows server error on failed login and signs in on valid credentials", async () => {
    const user = userEvent.setup()
    let attempt = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/auth/me") {
        return makeResponse({ authRequired: true, hasUsers: true, user: null })
      }
      if (url === "/api/auth/login" && init?.method === "POST") {
        attempt += 1
        if (attempt === 1) {
          return makeResponse({ detail: "Usuário ou senha inválidos." }, 401)
        }
        return makeResponse({
          user: { displayName: "Ana", id: 2, role: "member", username: "ana" },
        })
      }
      return makeResponse({ detail: "Unexpected" }, 500)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <AuthProvider>
        <AccountMenu />
      </AuthProvider>,
    )

    await user.click(await screen.findByRole("button", { name: /entrar/i }))
    await user.type(screen.getByLabelText(/^usuário$/i), "ana")
    await user.type(screen.getByLabelText(/^senha$/i), "errada-123")
    await user.click(screen.getByRole("button", { name: /^entrar$/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/usuário ou senha inválidos/i)

    await user.clear(screen.getByLabelText(/^senha$/i))
    await user.type(screen.getByLabelText(/^senha$/i), "correta-123")
    await user.click(screen.getByRole("button", { name: /^entrar$/i }))

    expect(await screen.findByRole("button", { name: /conta: ana/i })).toBeInTheDocument()
  })
})
