export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{count > 99 ? '99+' : count}</span>;
}
