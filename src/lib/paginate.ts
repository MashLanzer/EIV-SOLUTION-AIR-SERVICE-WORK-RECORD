export const PAGE_SIZE = 20;

export function parsePage(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function paginationArgs(page: number, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function pageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
