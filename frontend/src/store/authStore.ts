import { create } from "zustand"

import { authService } from "@/services/authService"
import { tokenStorage } from "@/services/tokenStorage"
import type { LoginPayload, RegisterPayload, User } from "@/types/auth"

interface AuthState {
  user: User | null
  status: "idle" | "loading" | "authenticated" | "unauthenticated"
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  loadCurrentUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  // login/register no tocan "status" mientras la request esta en vuelo: cada pagina
  // maneja su propio estado local de "isSubmitting" para el spinner del boton. Si
  // aca se pasara a "loading", PublicOnlyRoute reemplazaria todo el formulario por
  // el loader de pantalla completa y, al fallar, el formulario se remontaria desde
  // cero perdiendo el mensaje de error y lo que el usuario ya habia escrito.
  login: async (payload) => {
    const tokens = await authService.login(payload)
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)
    const user = await authService.me()
    set({ user, status: "authenticated" })
  },

  register: async (payload) => {
    await authService.register(payload)
    await get().login({ email: payload.email, password: payload.password })
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch {
      // Si el backend no puede revocar el token (p. ej. ya expiro), igual cerramos sesion localmente.
    } finally {
      tokenStorage.clear()
      set({ user: null, status: "unauthenticated" })
    }
  },

  loadCurrentUser: async () => {
    const accessToken = tokenStorage.getAccessToken()
    if (!accessToken) {
      set({ status: "unauthenticated" })
      return
    }
    set({ status: "loading" })
    try {
      const user = await authService.me()
      set({ user, status: "authenticated" })
    } catch {
      tokenStorage.clear()
      set({ user: null, status: "unauthenticated" })
    }
  },

  setUser: (user) => set({ user }),
}))
