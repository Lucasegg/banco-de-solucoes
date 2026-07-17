import { useEffect, useRef, type ChangeEvent } from 'react';
import { normalizeTotpCode } from '../types/mfa';

export function TotpInput({ value, onChange, disabled, label = 'Código de seis dígitos' }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <label className="block text-sm font-semibold">{label}<input ref={ref} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(normalizeTotpCode(event.target.value))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} disabled={disabled} className="mt-2 block w-full rounded-xl border border-line px-4 py-3 text-center text-2xl tracking-[.4em] disabled:opacity-60" /></label>;
}
