<script lang="ts" setup>
import type { TrainingTask } from '../types'
import { computed } from 'vue'

const props = defineProps<{ tasks: TrainingTask[] }>()

const sorted = computed(() =>
  [...props.tasks].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
)

const fmt = (ts?: string | null) => ts ? new Date(ts).toLocaleString() : '-'

const getCurrentStageProgress = (task: TrainingTask): number => {
  if (!task.progress?.current_stage || !task.progress?.stages) return 0
  const stage = task.progress.stages[task.progress.current_stage]
  return Math.round(stage?.progress || 0)
}

// Build absolute download URL for artifacts
const trainingServer = (import.meta as any).env?.VITE_TRAINING_SERVER || ''
const joinUrl = (base: string, path: string) => {
  const b = (base || '').replace(/\/+$/, '')
  const p = (path || '').replace(/^\/+/, '')
  return `${b}/${p}`
}

// Collect artifact entries from both output_files map and top-level fields
const artifactEntries = (t: TrainingTask): { label: string; path: string }[] => {
  const entries: { label: string; path: string }[] = []
  const files = t.results?.output_files
  if (files) {
    for (const [label, path] of Object.entries(files)) {
      if (typeof path === 'string') entries.push({ label, path })
    }
  }
  if (t.results?.binary_model && !entries.some(e => e.path === t.results!.binary_model)) {
    entries.push({ label: 'Binary Model', path: t.results!.binary_model })
  }
  if (t.results?.onnx_model && !entries.some(e => e.path === t.results!.onnx_model)) {
    entries.push({ label: 'ONNX Model', path: t.results!.onnx_model })
  }
  if (t.results?.pytorch_model && !entries.some(e => e.path === t.results!.pytorch_model)) {
    entries.push({ label: 'PyTorch Model', path: t.results!.pytorch_model })
  }
  return entries
}
const fileUrl = (path: string) => {
  // Extract filename from path like "output/cc02-4bit_magik.bin"
  const filename = path.split('/').pop() || path
  return joinUrl(trainingServer, `/api/output/${filename}`)
}
</script>

<template>
  <section>
    <article v-for="t in sorted" :key="t.task_id" class="task-card">
      <header class="task-header">
        <h4>{{ t.task_id }} (type: {{ t.type }})</h4>
        <span class="badge" :class="t.status">{{ t.status }}</span>
      </header>

      <div class="progress" v-if="t.status === 'running' && t.progress">
        <progress :value="t.progress.overall_progress" max="100">
          {{ t.progress.overall_progress }}%
        </progress>
        <div class="progress-text">
          {{ Math.round(t.progress.overall_progress || 0) }}% - {{ t.progress.current_stage }} 
          ({{ getCurrentStageProgress(t) }}%)
        </div>
      </div>

      <details>
        <summary>Details</summary>
        <ul>
          <li>Created: {{ fmt(t.created_at) }}</li>
          <li>Started: {{ fmt(t.started_at) }}</li>
          <li>Completed: {{ fmt(t.completed_at) }}</li>
          <li>Classes: {{ t.config?.num_classes }}</li>
          <li>Batch: {{ t.config?.batch_size }}</li>
          <li>Epochs: {{ t.config?.epochs_32bit }}/{{ t.config?.epochs_8bit }}/{{ t.config?.epochs_4bit }}</li>
        </ul>

        <div v-if="t.progress?.errors?.length">
          <strong>Errors:</strong>
          <ul>
            <li v-for="(e, i) in t.progress.errors" :key="i">{{ e.stage }}: {{ e.message }}</li>
          </ul>
        </div>

        <div v-if="t.status === 'completed' && t.results">
          <strong>Artifacts:</strong>
          <ul>
            <li v-for="file in artifactEntries(t)" :key="file.label">
              {{ file.label }}:
              <template v-if="file.path">
                <a :href="fileUrl(file.path)" target="_blank" rel="noreferrer" download>
                  Download
                </a>
                <code style="margin-left:.5rem">{{ file.path }}</code>
              </template>
              <template v-else>
                <code>Unavailable</code>
              </template>
            </li>
          </ul>
        </div>
      </details>
    </article>
  </section>
</template>

<style scoped>
.task-card { 
  margin: 0.3rem 0; 
  padding: 0.6rem;
}
.task-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 0.4rem;
}
.task-header h4 {
  margin: 0;
  font-size: 1rem;
}
.progress-text { 
  font-size: 0.85rem; 
  color: #64748b; 
  margin-top: 0.2rem; 
}
.badge { 
  padding: 0.1rem 0.4rem; 
  border-radius: 0.3rem; 
  text-transform: capitalize; 
  font-size: 0.8rem;
}
.badge.running { background: #0ea5e9; color: white; }
.badge.pending { background: #fbbf24; color: #111; }
.badge.completed { background: #22c55e; color: white; }
.badge.failed { background: #ef4444; color: white; }
.progress { 
  margin: 0.3rem 0; 
}
.progress progress {
  height: 0.8rem;
  width: 100%;
}
.actions { 
  margin-top: 0.4rem; 
}
details {
  margin: 0.4rem 0;
}
details ul {
  margin: 0.3rem 0;
  padding-left: 1rem;
}
details li {
  font-size: 0.85rem;
  margin: 0.1rem 0;
}
</style>
