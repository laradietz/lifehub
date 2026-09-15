export interface UserSettings {
  language: string
  currency: string
  timezone: string
  theme: "light" | "dark" | "system"
  enabled_modules: string[]
  dashboard_widgets: string[]
  notification_preferences: Record<string, unknown>
  ai_data_access_enabled: boolean
}

export type UserSettingsPayload = Partial<UserSettings>
