// Types for Moonshine (UsefulSensors) integration
export interface MoonshineModelInfo {
  name: string;
  path: string;
  size_mb: number;
  speed: string;
  status: ModelStatus;
  description?: string;
  language: string;
}

export type ModelStatus =
  | 'Available'
  | 'Missing'
  | { Downloading: number }
  | { Error: string }
  | { Corrupted: { file_size: number; expected_min_size: number } };

export interface MoonshineEngineState {
  currentModel: string | null;
  availableModels: MoonshineModelInfo[];
  isLoading: boolean;
  error: string | null;
}

// User-friendly model display configuration
export interface ModelDisplayInfo {
  friendlyName: string;
  icon: string;
  tagline: string;
  recommended?: boolean;
  tier: 'fastest' | 'balanced' | 'precise';
}

export const MODEL_DISPLAY_CONFIG: Record<string, ModelDisplayInfo> = {
  'moonshine-base': {
    friendlyName: 'Moonshine Base',
    icon: '🌙',
    tagline: 'Ultra rápido para inglés • Ideal para dispositivos edge',
    recommended: true,
    tier: 'fastest'
  },
};

// Model configuration for Moonshine models
export const MOONSHINE_MODEL_CONFIGS: Record<string, Partial<MoonshineModelInfo>> = {
  'moonshine-base': {
    description: 'Ultra-fast English model for real-time transcription',
    size_mb: 250,
    speed: 'Ultra Fast',
    language: 'en'
  },
};

// Get user-friendly display name for a model
export function getModelDisplayName(modelName: string): string {
  const displayInfo = MODEL_DISPLAY_CONFIG[modelName];
  return displayInfo?.friendlyName || modelName;
}

// Get model display info (icon, tagline, etc.)
export function getModelDisplayInfo(modelName: string): ModelDisplayInfo | null {
  return MODEL_DISPLAY_CONFIG[modelName] || null;
}

export function getStatusColor(status: ModelStatus): string {
  if (status === 'Available') return 'green';
  if (status === 'Missing') return 'gray';
  if (typeof status === 'object' && 'Downloading' in status) return 'blue';
  if (typeof status === 'object' && 'Error' in status) return 'red';
  return 'gray';
}

export function formatFileSize(sizeMb: number): string {
  if (sizeMb >= 1000) {
    return `${(sizeMb / 1000).toFixed(1)}GB`;
  }
  return `${sizeMb}MB`;
}

export function getRecommendedModel(): string {
  return 'moonshine-base';
}

// Tauri command wrappers for Moonshine backend
import { invoke } from '@tauri-apps/api/core';

export class MoonshineAPI {
  static async init(): Promise<void> {
    await invoke('moonshine_init');
  }

  static async getAvailableModels(): Promise<MoonshineModelInfo[]> {
    return await invoke('moonshine_get_available_models');
  }

  static async loadModel(modelName: string): Promise<void> {
    await invoke('moonshine_load_model', { modelName });
  }

  static async getCurrentModel(): Promise<string | null> {
    return await invoke('moonshine_get_current_model');
  }

  static async isModelLoaded(): Promise<boolean> {
    return await invoke('moonshine_is_model_loaded');
  }

  static async transcribeAudio(audioData: number[]): Promise<string> {
    return await invoke('moonshine_transcribe_audio', { audioData });
  }

  static async getModelsDirectory(): Promise<string> {
    return await invoke('moonshine_get_models_directory');
  }

  static async downloadModel(modelName: string): Promise<void> {
    await invoke('moonshine_download_model', { modelName });
  }

  static async cancelDownload(modelName: string): Promise<void> {
    await invoke('moonshine_cancel_download', { modelName });
  }

  static async deleteCorruptedModel(modelName: string): Promise<string> {
    return await invoke('moonshine_delete_corrupted_model', { modelName });
  }

  static async hasAvailableModels(): Promise<boolean> {
    return await invoke('moonshine_has_available_models');
  }

  static async validateModelReady(): Promise<string> {
    return await invoke('moonshine_validate_model_ready');
  }

  static async openModelsFolder(): Promise<void> {
    await invoke('open_moonshine_models_folder');
  }
}
