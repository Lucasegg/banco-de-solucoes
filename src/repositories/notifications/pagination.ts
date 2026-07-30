export function notificationPage<T>(items: T[], limit: number) {
  return { items: items.slice(0, limit), hasMore: items.length > limit };
}

export function mergeNotificationPages<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}
