export function notificationPage<T>(items: T[], limit: number) {
  return { items: items.slice(0, limit), hasMore: items.length > limit };
}
