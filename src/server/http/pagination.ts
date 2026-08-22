import { z } from "zod";

export const MAX_PAGE_SIZE = 50;

/** Every list endpoint takes the same two query params. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function skipTake({ page, pageSize }: Pagination) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function paged<T>(items: T[], total: number, p: Pagination): Paged<T> {
  return { items, total, page: p.page, pageSize: p.pageSize };
}
