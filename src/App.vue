<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Task, TaskFilter, TrainingTask } from './types';
import TrainingForm from './components/TrainingForm.vue'
import TrainingList from './components/TrainingList.vue'
import { useTrainingPolling } from './composables/useTrainingPolling'

const message = ref("AI Model Training");

// Local mock task UI state (kept for now)
const tasks = ref<Task[]>([]);

// Real training server state (via polling composable)
const { health, queueStats, tasks: trainingTasks, error, setConfig, refreshTasks, startPolling, stopPolling } = useTrainingPolling()
const filter = ref<TaskFilter>("all");

const filteredTasks = computed(() => {
  switch(filter.value) {
    case "all":
      return tasks.value;
    case "completed":
      return tasks.value.filter((task) => task.done);
    case "pending":
      return tasks.value.filter((task) => !task.done);
    case "running":
      return tasks.value.filter((task) => task.title=="running")
  }
  return tasks.value;
});


const totalDone = computed(() => tasks
  .value
  .reduce((total, task) => task.done ? total + 1: total, 0))

function addTask(newTask: string){
  tasks.value.push({
    id: crypto.randomUUID(),
    title: newTask,
    done: false,
  })
  console.log(newTask)
}

function toggleDone(id: string) {
  const task = tasks.value.find((task)=> task.id === id);
  if (task) {
    task.done = !task.done;
  }
}

function removeTask(id: string) {
  const index = tasks.value.findIndex((task) => task.id === id);
  if (index !== -1) {
    tasks.value.splice(index, 1)
  }
}

function setFilter(value: TaskFilter) {
  filter.value = value;
}

</script>

<template>
  <main>
    <h1>{{message}}</h1>

    <!-- Server Status Panel (Inline) -->
    <section>
      <header>
        <h3>Training Server Status</h3>
      </header>
      <article>
        <div v-if="error" class="contrast" style="padding: .5rem 1rem; color: #b00020">⚠️ {{ error }}</div>
        <div class="grid">
          <article>
            <header>Server Health</header>
            <p v-if="health">
              <strong>
                {{ health.status === 'healthy' ? '🟢 Online' : '🔴 Offline' }}
              </strong>
              <br>
              Worker: {{ health.worker_running ? 'Running' : 'Stopped' }}
              <br>
              <small>Last updated: {{ new Date(health.timestamp).toLocaleString() }}</small>
            </p>
            <p v-else>🔴 Offline</p>
          </article>
          <article>
            <header>Queue</header>
            <ul>
              <li>📋 Pending: <strong>{{ queueStats.pending }}</strong></li>
              <li>⚡ Running: <strong>{{ queueStats.running }}</strong></li>
              <li>✅ Completed: <strong>{{ queueStats.completed }}</strong></li>
            </ul>
          </article>
        </div>
      </article>
    </section>

    <!-- Start Training Form -->
    <TrainingForm @started="() => refreshTasks()" />

    <!-- Training Tasks (from server) -->
    <section>
      <header>
        <h3>Recent Training Tasks</h3>
      </header>
      <TrainingList :tasks="trainingTasks" />
      <div class="actions">
        <button class="outline" @click="refreshTasks">Refresh Tasks</button>
      </div>
    </section>

  </main>
</template>

<style>
main {
  max-width: 900px;
  margin: 0.8rem auto;
  padding: 0 1rem;
} 

main > section {
  margin: 1rem 0;
}

main > h1 {
  margin: 0.8rem 0 1.2rem 0;
  text-align: center;
}

.button-container {
  display: flex;
  justify-content: end;
  gap: 0.4rem; 
}

.actions {
  margin: 0.6rem 0;
}

.actions button {
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
}

/* Server status grid alignment */
.grid { 
  align-items: stretch; 
}
</style>
