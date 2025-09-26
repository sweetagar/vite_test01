import type { QueueStatus, ServerHealth, TaskListResponse, TaskResponse, TrainingConfig, StandardTrainingConfig, TrainingTask } from "../types";

const TRAINING_SERVER = import.meta.env.VITE_TRAINING_SERVER || "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const data = await response.json()
      detail = (data as any).detail || detail
    } catch {}
    throw new Error(detail)
  }
  return response.json() as Promise<T>
}

export async function getTrainingHealth(): Promise<ServerHealth> {
  const res = await fetch(`${TRAINING_SERVER}/api/health`)
  return handleResponse<ServerHealth>(res)
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const res = await fetch(`${TRAINING_SERVER}/api/queue`)
  return handleResponse<QueueStatus>(res)
}

export async function getAllTasks(status?: string, limit: number = 50): Promise<TaskListResponse> {
  const params = new URLSearchParams()
  if (status) params.append("status", status)
  params.append("limit", String(limit))
  const res = await fetch(`${TRAINING_SERVER}/api/tasks?${params.toString()}`)
  return handleResponse<TaskListResponse>(res)
}

export async function startMagikTraining(config: TrainingConfig): Promise<TaskResponse> {
  const res = await fetch(`${TRAINING_SERVER}/api/train/magik`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  })
  return handleResponse<TaskResponse>(res)
}

export async function startStandardTraining(config: StandardTrainingConfig): Promise<TaskResponse> {
  const res = await fetch(`${TRAINING_SERVER}/api/train/std`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  })
  return handleResponse<TaskResponse>(res)
}

// Legacy function - now routes to magik for backward compatibility
export async function startTraining(config: TrainingConfig): Promise<TaskResponse> {
  return startMagikTraining(config)
}

export async function getTaskProgress(taskId: string): Promise<TrainingTask> {
  const res = await fetch(`${TRAINING_SERVER}/api/progress/${taskId}`)
  return handleResponse<TrainingTask>(res)
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${TRAINING_SERVER}/api/tasks/${taskId}`, {
    method: "DELETE"
  })
  return handleResponse<void>(res)
}
