import { api } from "@/services/api"
import type { UserSettings, UserSettingsPayload } from "@/types/settings"

export const settingsService = {
  async get(): Promise<UserSettings> {
    const { data } = await api.get<UserSettings>("/settings")
    return data
  },

  async update(payload: UserSettingsPayload): Promise<UserSettings> {
    const { data } = await api.patch<UserSettings>("/settings", payload)
    return data
  },
}
