export interface ModelInfo {
  id: string;
  label: string;
  contextTokens: number;
}

export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  'grok-2': { id: 'grok-2', label: 'Grok 2 (demo)', contextTokens: 32768 },
  'grok-mini': { id: 'grok-mini', label: 'Grok Mini (demo)', contextTokens: 8192 },
};

export const MODEL_LIST: ModelInfo[] = Object.values(MODEL_REGISTRY);

export const DEFAULT_MODEL_ID = 'grok-2';
