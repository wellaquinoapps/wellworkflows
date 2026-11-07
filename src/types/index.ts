export type AspectRatio = '9:16' | '16:9' | '1:1';

export type WorkflowStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'partial' | 'failed';

export interface WorkflowImage {
  id: string;
  workflow_id: string;
  user_id: string;
  role: 'reference' | 'result';
  position: number;
  storage_path: string;
  mime_type: string;
  file_size: number;
  prompt?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  signed_url?: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  prompt: string;
  aspect_ratio: AspectRatio;
  output_count: number;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workflow_count?: number;
}

export interface ApiCredential {
  id: string;
  label: string;
  google_project_ref?: string;
  priority: number;
  enabled: boolean;
  status: 'active' | 'cooldown' | 'invalid' | 'disabled';
  last_used_at?: string;
  cooldown_until?: string;
  last_error_code?: string;
  masked_key: string;
  created_at: string;
  updated_at: string;
}

export interface LocalReferenceImage {
  id: string;
  file?: File;
  previewUrl: string;
  storagePath?: string;
  roleType: 'Cenário' | 'Produto' | 'Pessoa' | 'Referência de estilo';
  position: number;
  isUploading?: boolean;
}

