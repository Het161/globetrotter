import { z } from "zod";

/**
 * These schemas are imported by both the react-hook-form resolver on the client
 * and the route handler on the server, so a field can never be validated one
 * way in the browser and another way in the API.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.")
  .max(160)
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords are capped at 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60, "That name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({
    token: z.string().min(10, "This reset link is incomplete."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Both passwords need to match.",
    path: ["confirm"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
