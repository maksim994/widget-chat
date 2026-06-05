import { z } from "zod";

/** Relaxed email for local/dev domains (e.g. admin@demo.local) */
export const emailSchema = z
  .string()
  .min(3)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некорректный email");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z.object({
  companyName: z.string().min(1, "Укажите название компании"),
  email: emailSchema,
  password: z.string().min(6, "Минимум 6 символов"),
  name: z.string().min(1, "Укажите имя"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
