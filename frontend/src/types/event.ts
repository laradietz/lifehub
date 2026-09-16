export interface Event {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string | null
  category_id: string | null
  household_id: string | null
  created_at: string
  updated_at: string
}

export interface EventPayload {
  title?: string
  description?: string | null
  start_at?: string
  end_at?: string | null
  all_day?: boolean
  location?: string | null
  category_id?: string | null
  household_id?: string | null
}
