// Existing task types for mock UI
export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export type TaskFilter = "all" | "running" | "pending" | "completed"

// ================================
// Training Server Types (REAL API)
// ================================

export type TrainingStatus = "pending" | "running" | "completed" | "failed"

// Magik Training Config (ARM Cortex MCU)
export interface TrainingConfig {
  task_id?: string;
  dataset_source?: string;
  dataset_path?: string;
  num_classes: number;
  batch_size: number;
  epochs_32bit: number;
  epochs_8bit: number;
  epochs_4bit: number;
  run_testing?: boolean;
  run_detection?: boolean;
  run_final_detection?: boolean;
  roboflow_api_key?: string;
  roboflow_workspace?: string;
  roboflow_project?: string;
  roboflow_version?: number;
  test_image?: string;
  retrain?: boolean;
  device?: string; // GPU device ID, e.g. "0"
}

// Standard Training Config (Computer)
export interface StandardTrainingConfig {
  task_id?: string;
  dataset_source?: string;
  dataset_path?: string;
  num_classes: number;
  batch_size: number;
  epochs: number;
  model_size: string; // "yolov5s", "yolov5m", "yolov5l", etc.
  img_size: number;
  roboflow_api_key?: string;
  roboflow_workspace?: string;
  roboflow_project?: string;
  roboflow_version?: number;
  test_image?: string;
  retrain?: boolean;
  device?: string;
}

export interface StageProgress {
  status: "pending" | "running" | "completed" | "error";
  progress: number; // 0 - 100
  metrics?: Record<string, any>;
}

export interface TaskError {
  stage: string;
  message: string;
}

export interface TaskProgress {
  overall_progress: number; // 0 - 100
  current_stage: "dataset_download" | "train_32bit" | "train_8bit" | "train_4bit" | "model_conversion";
  stages: {
    dataset_download: StageProgress;
    train_32bit: StageProgress;
    train_8bit: StageProgress;
    train_4bit: StageProgress;
    model_conversion: StageProgress;
  };
  errors: TaskError[];
}

export interface TaskResults {
  status: "success" | "failed";
  pytorch_model?: string; // e.g. output/cc02-4bit.pt
  onnx_model?: string;    // e.g. output/cc02-4bit.onnx
  binary_model?: string;  // e.g. output/cc02-4bit_magik.bin
  output_files?: Record<string, string>; // label -> path mapping
}

export interface TrainingTask {
  task_id: string;
  type: "magik" | "std";
  status: TrainingStatus;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  config: TrainingConfig;
  progress: TaskProgress;
  results?: TaskResults;
}

export interface QueueStatus {
  pending: number;
  running: number;
  completed: number;
  current_task: string | null;
}

export interface ServerHealth {
  status: "healthy" | "unhealthy";
  worker_running: boolean;
  current_task: string | null;
  timestamp: string;
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface TaskListResponse {
  tasks: TrainingTask[];
  total: number;
}
