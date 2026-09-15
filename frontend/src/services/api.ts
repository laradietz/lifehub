import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { tokenStorage } from "@/services/tokenStorage"
import type { Tokens } from "@/types/auth"

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    throw new Error("No hay refresh token disponible.")
  }
  const response = await axios.post<Tokens>(`${baseURL}/auth/refresh`, { refresh_token: refreshToken })
  tokenStorage.setTokens(response.data.access_token, response.data.refresh_token)
  return response.data.access_token
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/")

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        tokenStorage.clear()
        window.location.assign("/login")
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
      return detail[0].msg
    }
  }
  return fallback
}
