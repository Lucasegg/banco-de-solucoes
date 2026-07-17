export function formatNotificationDate(value: string, now = new Date()): string {
  const date = new Date(value); const elapsed = now.getTime() - date.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return date.toLocaleDateString('pt-BR');
  if (elapsed < 60_000) return 'Agora';
  if (elapsed < 3_600_000) return `Há ${Math.floor(elapsed / 60_000)} minutos`;
  if (elapsed < 86_400_000) return `Há ${Math.floor(elapsed / 3_600_000)} horas`;
  if (elapsed < 172_800_000) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
