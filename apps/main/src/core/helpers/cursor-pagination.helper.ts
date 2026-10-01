export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export function paginateByCursor<T extends { createdAt: Date }>(
  rawItems: T[],
  limit: number,
  getCursor: (item: T) => string = (item) => item.createdAt.toISOString(),
): CursorPaginatedResult<T> {
  const hasNextPage = rawItems.length > limit;
  const items = hasNextPage ? rawItems.slice(0, limit) : rawItems;
  const lastItem = items.at(-1);
  const nextCursor = hasNextPage && lastItem ? getCursor(lastItem) : null;

  return { items, nextCursor, hasNextPage };
}
