import { beforeEach, describe, expect, it, vi } from "vitest"

import { authService } from "@/services/authService"
import { tokenStorage } from "@/services/tokenStorage"
import { useAuthStore } from "@/store/authStore"
import type { User } from "@/types/auth"

vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}))

const mockedAuthService = vi.mocked(authService)

const fakeUser: User = {
  id: "user-1",
  email: "ana@example.com",
  full_name: "Ana",
  avatar_url: null,
  is_active: true,
  is_verified: true,
  onboarding_completed: true,
} as unknown as User

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, status: "idle" })
  vi.clearAllMocks()
})

describe("authStore.login", () => {
  it("guarda los tokens, carga el usuario y marca status=authenticated", async () => {
    mockedAuthService.login.mockResolvedValue({ access_token: "access-1", refresh_token: "refresh-1", token_type: "bearer" })
    mockedAuthService.me.mockResolvedValue(fakeUser)

    await useAuthStore.getState().login({ email: "ana@example.com", password: "supersecret123" })

    expect(tokenStorage.getAccessToken()).toBe("access-1")
    expect(tokenStorage.getRefreshToken()).toBe("refresh-1")
    expect(useAuthStore.getState().user).toEqual(fakeUser)
    expect(useAuthStore.getState().status).toBe("authenticated")
  })

  it(
    "NO pasa status a 'loading' durante el request (evita que PublicOnlyRoute desmonte " +
      "el formulario y se pierda el error, ver HANDOFF problema #3)",
    async () => {
      let statusDuringRequest: string | undefined
      mockedAuthService.login.mockImplementation(async () => {
        statusDuringRequest = useAuthStore.getState().status
        return { access_token: "a", refresh_token: "r", token_type: "bearer" }
      })
      mockedAuthService.me.mockResolvedValue(fakeUser)

      await useAuthStore.getState().login({ email: "ana@example.com", password: "supersecret123" })

      expect(statusDuringRequest).toBe("idle")
    },
  )

  it("propaga el error si el login falla y no deja tokens a medias", async () => {
    mockedAuthService.login.mockRejectedValue(new Error("credenciales invalidas"))

    await expect(
      useAuthStore.getState().login({ email: "ana@example.com", password: "mala" }),
    ).rejects.toThrow("credenciales invalidas")

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(useAuthStore.getState().status).toBe("idle")
  })
})

describe("authStore.register", () => {
  it("registra y despues hace login automaticamente", async () => {
    mockedAuthService.register.mockResolvedValue(fakeUser)
    mockedAuthService.login.mockResolvedValue({ access_token: "a", refresh_token: "r", token_type: "bearer" })
    mockedAuthService.me.mockResolvedValue(fakeUser)

    await useAuthStore.getState().register({ email: "ana@example.com", password: "supersecret123" })

    expect(mockedAuthService.register).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "supersecret123",
    })
    expect(mockedAuthService.login).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "supersecret123",
    })
    expect(useAuthStore.getState().status).toBe("authenticated")
  })
})

describe("authStore.logout", () => {
  it("limpia los tokens y el usuario incluso si el backend falla al revocar", async () => {
    tokenStorage.setTokens("access-1", "refresh-1")
    useAuthStore.setState({ user: fakeUser, status: "authenticated" })
    mockedAuthService.logout.mockRejectedValue(new Error("el token ya expiro"))

    await useAuthStore.getState().logout()

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().status).toBe("unauthenticated")
  })

  it("no llama al backend si no hay refresh token guardado", async () => {
    useAuthStore.setState({ user: fakeUser, status: "authenticated" })

    await useAuthStore.getState().logout()

    expect(mockedAuthService.logout).not.toHaveBeenCalled()
    expect(useAuthStore.getState().status).toBe("unauthenticated")
  })
})

describe("authStore.loadCurrentUser", () => {
  it("marca unauthenticated si no hay access token", async () => {
    await useAuthStore.getState().loadCurrentUser()
    expect(useAuthStore.getState().status).toBe("unauthenticated")
    expect(mockedAuthService.me).not.toHaveBeenCalled()
  })

  it("limpia todo si el token guardado ya no es valido", async () => {
    tokenStorage.setTokens("stale-access", "stale-refresh")
    mockedAuthService.me.mockRejectedValue(new Error("401"))

    await useAuthStore.getState().loadCurrentUser()

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(useAuthStore.getState().status).toBe("unauthenticated")
  })
})
