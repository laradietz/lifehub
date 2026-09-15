import { api } from "@/services/api"
import type { Task, TaskPayload, TaskStatus } from "@/types/task"

export const taskService = {
  async list(params?: { status?: TaskStatus }): Promise<Task[]> {
    const { data } = await api.get<Task[]>("/tasks", { params })
    return data
  },

  async create(payload: TaskPayload): Promise<Task> {
    const { data } = await api.post<Task>("/tasks", payload)
    return data
  },

  async update(id: string, payload: TaskPayload): Promise<Task> {
    const { data } = await api.patch<Task>(`/tasks/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },
}
