import { z } from "zod";

export const adminListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export type AdminListQuery = z.infer<typeof adminListQuery>;
