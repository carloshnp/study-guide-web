import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"

import { authApi } from "./api"

function makeResponse(payload: unknown, status = 200) {
  const body = status === 204 ? "" : JSON.stringify(payload)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => body,
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("authApi", () => {
  it("calls /api/auth/me, register, login, and logout with expected payloads", async () => {
    const user = { displayName: "Carlos", id: 1, role: "owner", username: "carlos" }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/auth/me" && init?.method === "GET") {
        return makeResponse({ authRequired: false, hasUsers: false, user: null })
      }
      if (url === "/api/auth/register" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          displayName: "Carlos",
          password: "secret-password",
          username: "carlos",
        })
        return makeResponse({ user }, 201)
      }
      if (url === "/api/auth/login" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          password: "secret-password",
          username: "carlos",
        })
        return makeResponse({ user })
      }
      if (url === "/api/auth/logout" && init?.method === "POST") {
        return makeResponse(null, 204)
      }
      return makeResponse({ detail: "Unexpected" }, 500)
    })
    vi.stubGlobal("fetch", fetchMock)

    expect(await authApi.me()).toEqual({ authRequired: false, hasUsers: false, user: null })
    expect(
      await authApi.register({
        displayName: "Carlos",
        password: "secret-password",
        username: "carlos",
      }),
    ).toEqual(user)
    expect(await authApi.login({ password: "secret-password", username: "carlos" })).toEqual(user)
    await authApi.logout()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("throws ApiError with server detail on 401/409 failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(makeResponse({ detail: "Usuário ou senha inválidos." }, 401)),
    )
    await expect(
      authApi.login({ password: "bad", username: "carlos" }),
    ).rejects.toMatchObject({
      message: "Usuário ou senha inválidos.",
      status: 401,
    })

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("offline")))
    await expect(authApi.me()).rejects.toBeInstanceOf(ApiError)
  })
})
