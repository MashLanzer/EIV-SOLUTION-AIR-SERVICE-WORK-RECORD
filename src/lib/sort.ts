export type SortDir = "asc" | "desc";

export interface SortState<T extends string> {
  sort: T;
  dir: SortDir;
}

// Validate ?sort= / ?dir= against an allow-list so an arbitrary column name
// can never reach Prisma's orderBy.
export function parseSort<T extends string>(
  rawSort: string | string[] | undefined,
  rawDir: string | string[] | undefined,
  allowed: readonly T[],
  fallback: SortState<T>
): SortState<T> {
  const s = Array.isArray(rawSort) ? rawSort[0] : rawSort;
  const d = Array.isArray(rawDir) ? rawDir[0] : rawDir;
  return {
    sort: allowed.includes(s as T) ? (s as T) : fallback.sort,
    dir: d === "asc" || d === "desc" ? d : fallback.dir,
  };
}
