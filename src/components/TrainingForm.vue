<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { TrainingConfig, StandardTrainingConfig } from '../types'
import { startMagikTraining, startStandardTraining } from '../services/trainingApi'

const emitting = defineEmits<{
  started: [taskId: string]
}>()

type TrainingType = "magik" | "std"

const trainingType = ref<TrainingType>("magik")
const useRoboflow = ref(true)
const isSubmitting = ref(false)
const error = ref("")

// DEFAULT VALUES FOR MAGIK CONFIG
const magikConfig = ref<TrainingConfig>({
  roboflow_api_key: import.meta.env.VITE_ROBOFLOW_API_KEY || "",
  roboflow_workspace: "cc-c5pfr",
  roboflow_project: "cc-cam-d-3fmu4",
  roboflow_version: 1,
  num_classes: 3,
  batch_size: 16,
  epochs_32bit: 10,
  epochs_8bit: 10,
  epochs_4bit: 10,
  run_final_detection: true,
  retrain: false,
  device: "0",
  test_image: "test.jpg",
})

// DEFAULT VALUES FOR STANDARD CONFIG
const stdConfig = ref<StandardTrainingConfig>({
  roboflow_api_key: import.meta.env.VITE_ROBOFLOW_API_KEY || "",
  roboflow_workspace: "cc-c5pfr",
  roboflow_project: "cc-cam-d-3fmu4",
  roboflow_version: 1,
  num_classes: 3,
  batch_size: 16,
  epochs: 10,
  model_size: "yolov5s",
  img_size: 640,
  retrain: false,
  device: "0",
  test_image: "test.jpg",
})

const currentConfig = computed(() => 
  trainingType.value === "magik" ? magikConfig.value : stdConfig.value
)

async function submitTraining() {
  try {
    error.value = ""
    isSubmitting.value = true
    
    const res = trainingType.value === "magik" 
      ? await startMagikTraining(magikConfig.value)
      : await startStandardTraining(stdConfig.value)
      
    emitting('started', res.task_id)
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submitTraining">
    <fieldset>
      <legend>Training Configuration</legend>

      <div v-if="error" class="contrast" style="padding: .5rem 1rem; color: #b00020">⚠️ {{ error }}</div>

      <!-- Training Type Selection -->
      <fieldset>
        <legend>Training Type</legend>
        <label>
          <input v-model="trainingType" type="radio" value="magik">
          Magik (ARM Cortex MCU)
        </label>
        <label>
          <input v-model="trainingType" type="radio" value="std">
          Standard (Computer)
        </label>
      </fieldset>

      <label>
        Task ID (optional)
        <input v-model="currentConfig.task_id" type="text" placeholder="auto-generated">
      </label>

      <label>
        <input v-model="currentConfig.retrain" type="checkbox">
        Retrain task
      </label>

      <label>
        Number of Classes
        <input v-model.number="currentConfig.num_classes" type="number" min="1" required>
      </label>

      <label>
        Batch Size
        <input v-model.number="currentConfig.batch_size" type="number" min="1" required>
      </label>

      <label>
        GPU Device
        <select v-model="currentConfig.device" required>
          <option value="0">GPU 0</option>
          <option value="1">GPU 1</option>
          <option value="2">GPU 2</option>
          <option value="3">GPU 3</option>
          <option value="cpu">CPU Only</option>
        </select>
      </label>

      <!-- Magik-specific fields -->
      <div v-if="trainingType === 'magik'" class="grid">
        <label>
          32-bit Epochs
          <input v-model.number="magikConfig.epochs_32bit" type="number" min="1" required>
        </label>
        <label>
          8-bit Epochs
          <input v-model.number="magikConfig.epochs_8bit" type="number" min="1" required>
        </label>
        <label>
          4-bit Epochs
          <input v-model.number="magikConfig.epochs_4bit" type="number" min="1" required>
        </label>
      </div>

      <!-- Standard-specific fields -->
      <div v-if="trainingType === 'std'" class="grid">
        <label>
          Epochs
          <input v-model.number="stdConfig.epochs" type="number" min="1" required>
        </label>
        <label>
          Model Size
          <select v-model="stdConfig.model_size" required>
            <option value="yolov5n">YOLOv5n (nano)</option>
            <option value="yolov5s">YOLOv5s (small)</option>
            <option value="yolov5m">YOLOv5m (medium)</option>
            <option value="yolov5l">YOLOv5l (large)</option>
            <option value="yolov5x">YOLOv5x (extra large)</option>
          </select>
        </label>
        <label>
          Image Size
          <input v-model.number="stdConfig.img_size" type="number" min="320" step="32" required>
        </label>
      </div>

      <!-- Magik-specific options -->
      <div v-if="trainingType === 'magik'">
        <label>
          <input v-model="magikConfig.run_testing" type="checkbox">
          Run Testing
        </label>
        <label>
          <input v-model="magikConfig.run_detection" type="checkbox">
          Run Detection
        </label>
        <label>
          <input v-model="magikConfig.run_final_detection" type="checkbox">
          Run Final Detection
        </label>
      </div>

      <details open>
        <summary>Dataset Configuration</summary>
        <label>
          <input v-model="useRoboflow" type="checkbox">
          Use Roboflow Dataset
        </label>

        <div v-if="useRoboflow" class="grid">
          <label>
            API Key
            <input v-model="currentConfig.roboflow_api_key" type="password" placeholder="roboflow api">
          </label>
          <label>
            Workspace
            <input v-model="currentConfig.roboflow_workspace" type="text" placeholder="your-workspace">
          </label>
          <label>
            Project
            <input v-model="currentConfig.roboflow_project" type="text" placeholder="your-project">
          </label>
          <label>
            Version
            <input v-model.number="currentConfig.roboflow_version" type="number" min="0" placeholder="ver number">
          </label>
        </div>

        <label v-else>
          Dataset Path
          <input v-model="currentConfig.dataset_path" type="text" placeholder="./datasets/my_dataset">
        </label>

        <label>
          Test Image Path
          <input v-model="currentConfig.test_image" type="text" placeholder="test.jpg">
        </label>
      </details>

      <div class="actions">
        <button type="submit" :aria-busy="isSubmitting">
          {{ isSubmitting ? 'Starting…' : `🚀 Start ${trainingType.toUpperCase()} Training` }}
        </button>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
.actions { display: flex; justify-content: flex-end; }
</style>
