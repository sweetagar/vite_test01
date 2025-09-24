import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getAllTasks, getTaskProgress, getTrainingHealth } from '../services/trainingApi'
import type { ServerHealth, TrainingTask } from '../types'

export interface PollingConfig {
  healthIntervalMs: number
  tasksIntervalMs: number
  progressIntervalMs: number
}

// Default config, overridable via .env
const defaultConfig: PollingConfig = {
  healthIntervalMs: Number((import.meta as any).env?.VITE_POLL_HEALTH_MS ?? 30000),
  tasksIntervalMs: Number((import.meta as any).env?.VITE_POLL_TASKS_MS ?? 15000),
  progressIntervalMs: Number((import.meta as any).env?.VITE_POLL_PROGRESS_MS ?? 1000),
}

export function useTrainingPolling(initial?: Partial<PollingConfig>) {
  const config = ref<PollingConfig>({ ...defaultConfig, ...(initial || {}) })

  const health = ref<ServerHealth | null>(null)
  const tasks = ref<TrainingTask[]>([])
  const error = ref<string>('')

  // Calculate queue stats from tasks data
  const queueStats = computed(() => ({
    pending: tasks.value.filter(t => t.status === 'pending').length,
    running: tasks.value.filter(t => t.status === 'running').length,
    completed: tasks.value.filter(t => t.status === 'completed').length,
    current_task: tasks.value.find(t => t.status === 'running')?.task_id || null
  }))

  let healthTimer: number | null = null
  let tasksTimer: number | null = null
  let progressTimer: number | null = null

  async function refreshHealth() {
    try {
      const h = await getTrainingHealth()
      health.value = h
      // Clear error if health check succeeds
      if (error.value.includes('health') || error.value.includes('fetch')) {
        error.value = ''
      }
    } catch (e: any) {
      // Clear health data on failure to show offline immediately
      health.value = null
      error.value = e?.message || String(e)
    }
  }

  async function refreshTasks() {
    try {
      const list = await getAllTasks()
      const prev = tasks.value
      const merged = list.tasks.map((nt) => {
        const ot = prev.find(t => t.task_id === nt.task_id)
        return {
          ...(ot || {}),   // keep any previously known detailed fields (e.g., progress)
          ...nt,           // apply fresh list fields (status/timestamps/etc.)
          progress: (nt as any).progress ?? ot?.progress // do NOT clear progress if list lacks it
        }
      })
      tasks.value = merged
      
      // Hydrate missing details for tasks that need it
      await hydrateMissingDetails()
    } catch (e: any) {
      error.value = e?.message || String(e)
    }
  }

  async function hydrateMissingDetails() {
    try {
      // Find tasks needing details hydration (config or results missing, not currently running)
      const needsHydration = tasks.value.filter(t => 
        t.status !== 'running' && 
        (!t.config?.num_classes || !t.results)
      )
      
      if (needsHydration.length === 0) return
      
      // Fetch details with concurrency limit (max 3 at once)
      const CONCURRENCY = 3
      for (let i = 0; i < needsHydration.length; i += CONCURRENCY) {
        const batch = needsHydration.slice(i, i + CONCURRENCY)
        const details = await Promise.allSettled(
          batch.map(t => getTaskProgress(t.task_id))
        )
        
        details.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const updated = res.value
            const taskIndex = tasks.value.findIndex(t => t.task_id === updated.task_id)
            if (taskIndex !== -1) {
              const cur = tasks.value[taskIndex]
              tasks.value[taskIndex] = {
                ...cur,
                config: updated.config,
                results: updated.results,
                started_at: updated.started_at,
                completed_at: updated.completed_at,
              }
            }
          }
        })
      }
    } catch (e: any) {
      // Silent failure for hydration - don't overwrite main error state
      console.warn('Failed to hydrate task details:', e)
    }
  }

  async function refreshProgress() {
    try {
      const running = tasks.value.filter(t => t.status === 'running')
      if (running.length === 0) return
      // Fetch progress in parallel
      const updates = await Promise.allSettled(running.map(t => getTaskProgress(t.task_id)))
      updates.forEach((res) => {
        if (res.status === 'fulfilled') {
          const updated = res.value
          const i = tasks.value.findIndex(t => t.task_id === updated.task_id)
          if (i !== -1) {
            const cur = tasks.value[i]
            tasks.value[i] = {
              ...cur,
              status: updated.status,
              progress: updated.progress,
              results: updated.results,
              started_at: updated.started_at,
              completed_at: updated.completed_at,
            }
          }
        }
      })
    } catch (e: any) {
      error.value = e?.message || String(e)
    }
  }

  function startPolling() {
    stopPolling()
    refreshHealth(); refreshTasks(); refreshProgress()
    healthTimer = window.setInterval(refreshHealth, config.value.healthIntervalMs)
    tasksTimer = window.setInterval(refreshTasks, config.value.tasksIntervalMs)
    progressTimer = window.setInterval(refreshProgress, config.value.progressIntervalMs)
  }

  function stopPolling() {
    if (healthTimer) clearInterval(healthTimer)
    if (tasksTimer) clearInterval(tasksTimer)
    if (progressTimer) clearInterval(progressTimer)
    healthTimer = tasksTimer = progressTimer = null
  }

  function setConfig(next: Partial<PollingConfig>) {
    config.value = { ...config.value, ...next }
    // Restart timers to apply new intervals
    startPolling()
  }

  onMounted(startPolling)
  onUnmounted(stopPolling)

  return { health, queueStats, tasks, error, config, setConfig, startPolling, stopPolling, refreshTasks, refreshHealth }
}
