import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { supabaseConfig } from '../../integrations/supabase/config';

export type ImageBucket = 'avatars' | 'problem-images' | 'solution-images';
export type UploadProgress = { phase: 'validating' | 'uploading' | 'done'; progress: number };
export type ImageUploadResult = { ok: true; url: string; path: string } | { ok: false; message: string };
export type ImageRemoveResult = { ok: true } | { ok: false; message: string };

export const IMAGE_UPLOAD_RULES = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  buckets: {
    avatar: 'avatars',
    problem: 'problem-images',
    solution: 'solution-images',
  } as const,
};

const extensionByMime: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const message = (error: unknown, fallback: string) => error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;

export class StorageImageService {
  constructor(private readonly client: SupabaseClient) {}

  validateFile(file: File): { ok: true } | { ok: false; message: string } {
    if (!IMAGE_UPLOAD_RULES.mimeTypes.includes(file.type as (typeof IMAGE_UPLOAD_RULES.mimeTypes)[number])) return { ok: false, message: 'Formato não permitido. Envie JPEG, PNG ou WebP.' };
    if (file.size > IMAGE_UPLOAD_RULES.maxBytes) return { ok: false, message: 'Arquivo acima do limite de 5 MB.' };
    return { ok: true };
  }

  createPath(userId: string, file: File) {
    const ext = extensionByMime[file.type] ?? 'bin';
    const random = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${userId}/${Date.now()}-${random}.${ext}`;
  }

  getPublicUrl(bucket: ImageBucket, path: string) {
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async uploadImage(bucket: ImageBucket, userId: string, file: File, onProgress?: (state: UploadProgress) => void): Promise<ImageUploadResult> {
    onProgress?.({ phase: 'validating', progress: 5 });
    const validation = this.validateFile(file);
    if (!validation.ok) return validation;
    const path = this.createPath(userId, file);
    onProgress?.({ phase: 'uploading', progress: 35 });
    const { error } = await this.client.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) return { ok: false, message: message(error, 'Não foi possível enviar a imagem.') };
    onProgress?.({ phase: 'done', progress: 100 });
    return { ok: true, path, url: this.getPublicUrl(bucket, path) };
  }

  async replaceImage(bucket: ImageBucket, userId: string, file: File, currentUrl?: string | null, onProgress?: (state: UploadProgress) => void) {
    const uploaded = await this.uploadImage(bucket, userId, file, onProgress);
    if (!uploaded.ok) return uploaded;
    return { ...uploaded, previousPath: this.getOwnStoragePath(bucket, userId, currentUrl) };
  }

  async removeImage(bucket: ImageBucket, userId: string, url?: string | null): Promise<ImageRemoveResult> {
    const path = this.getOwnStoragePath(bucket, userId, url);
    if (!path) return { ok: true };
    const { error } = await this.client.storage.from(bucket).remove([path]);
    return error ? { ok: false, message: message(error, 'Não foi possível remover a imagem antiga.') } : { ok: true };
  }

  isProjectStorageUrl(url?: string | null) { return Boolean(url && supabaseConfig.url && url.startsWith(`${supabaseConfig.url.replace(/\/$/, '')}/storage/v1/object/public/`)); }

  getOwnStoragePath(bucket: ImageBucket, userId: string, url?: string | null) {
    if (!this.isProjectStorageUrl(url) || !url) return null;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
    return path.startsWith(`${userId}/`) && !path.includes('..') ? path : null;
  }
}

export const ImageUploadRepository = supabaseClient ? new StorageImageService(supabaseClient) : null;
