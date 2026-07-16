import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { IMAGE_UPLOAD_RULES } from '../../repositories/images';

type Props = {
  label: string;
  currentUrl?: string;
  value: File | null;
  removed: boolean;
  uploading?: boolean;
  progress?: number;
  error?: string;
  alt: string;
  onChange: (file: File | null) => void;
  onRemove: () => void;
};

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 3)} MB`;

export function ImageUploadField({ label, currentUrl, value, removed, uploading = false, progress = 0, error, alt, onChange, onRemove }: Props) {
  const [id] = useState(() => `image-upload-${Math.random().toString(36).slice(2)}`);
  const [localError, setLocalError] = useState('');
  const preview = useMemo(() => value ? URL.createObjectURL(value) : undefined, [value]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const visibleImage = preview || (!removed ? currentUrl : undefined);
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLocalError('');
    if (!file) return onChange(null);
    if (!IMAGE_UPLOAD_RULES.mimeTypes.includes(file.type as never)) { setLocalError('Formato não permitido. Envie JPEG, PNG ou WebP.'); event.target.value = ''; return; }
    if (file.size > IMAGE_UPLOAD_RULES.maxBytes) { setLocalError('Arquivo acima do limite de 5 MB.'); event.target.value = ''; return; }
    onChange(file);
  };
  const shownError = error || localError;
  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-slate-50 p-4 text-sm md:col-span-2">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <p id={helpId} className="text-xs text-muted">JPEG, PNG ou WebP até 5 MB. Use o seletor nativo do dispositivo; SVG não é aceito.</p>
      {visibleImage ? <img src={visibleImage} alt={alt} className="h-48 w-full rounded-2xl border border-line bg-white object-cover sm:w-80" /> : <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-muted">Nenhuma imagem selecionada.</div>}
      {value && <p className="text-xs text-slate-700">Selecionado: <strong>{value.name}</strong> ({formatBytes(value.size)})</p>}
      {uploading && <div className="grid gap-1" role="status" aria-live="polite"><span className="text-xs font-semibold text-teal-700">Enviando imagem...</span><progress className="h-2 w-full" value={progress} max={100}>{progress}%</progress></div>}
      {shownError && <p id={errorId} className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">{shownError}</p>}
      <div className="flex flex-wrap gap-2">
        <input id={id} className="sr-only" type="file" accept={IMAGE_UPLOAD_RULES.mimeTypes.join(',')} onChange={pickFile} disabled={uploading} aria-describedby={`${helpId}${shownError ? ` ${errorId}` : ''}`} />
        <label htmlFor={id} tabIndex={0} className="cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-400">Selecionar imagem</label>
        {(value || visibleImage) && <button type="button" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" onClick={() => { setLocalError(''); onRemove(); }} disabled={uploading}>Remover imagem</button>}
      </div>
    </div>
  );
}
