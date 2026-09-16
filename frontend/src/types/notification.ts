export type NotificationType = "task" | "reminder" | "subscription" | "event" | "system" | "document" | "vehicle"
export type NotificationChannel = "in_app" | "email" | "push"

export interface Notification {
  id: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  message: string
  is_read: boolean
  related_entity_type: string | null
  related_entity_id: string | null
  created_at: string
}
