import { api } from "@/services/api"
import type { LoginPayload, RegisterPayload, Tokens, User } from "@/types/auth"

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<User>("/auth/register", payload)
    return data
  },

  async login(payload: LoginPayload): Promise<Tokens> {
    const form = new URLSearchParams()
    form.set("username", payload.email)
    form.set("password", payload.password)
    const { data } = await api.post<Tokens>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post("/auth/logout", { refresh_token: refreshToken })
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/users/me")
    return data
  },

  async updateMe(payload: { full_name?: string; avatar_url?: string }): Promise<User> {
    const { data } = await api.patch<User>("/users/me", payload)
    return data
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post("/auth/password-reset/request", { email })
  },

  async confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
    await api.post("/auth/password-reset/confirm", { email, code, new_password: newPassword })
  },
}
