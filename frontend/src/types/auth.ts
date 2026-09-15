export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  is_verified: boolean
  onboarding_completed: boolean
  created_at: string
}

export interface Tokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name?: string
}

export interface ApiError {
  detail: string | { msg: string; loc: (string | number)[] }[]
}
