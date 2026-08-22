import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60).optional(),
  email: emailSchema.optional(),
  avatarUrl: z.string().trim().max(400).nullable().optional(),
  language: z.enum(["en", "hi", "gu"]).optional(),
  currency: z
    .enum(["USD", "INR", "EUR", "GBP", "JPY", "AED", "SGD", "AUD", "THB"])
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Both passwords need to match.",
    path: ["confirm"],
  });

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", {
    errorMap: () => ({ message: 'Type DELETE exactly to confirm.' }),
  }),
});

export const savedCitySchema = z.object({ cityId: z.string().min(1) });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
