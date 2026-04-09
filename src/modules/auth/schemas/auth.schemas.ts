import { z } from "zod";

export const registerClientSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z
    .string()
    .trim()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(100, "A senha deve ter no máximo 100 caracteres."),
  firstName: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(120, "Nome deve ter no máximo 120 caracteres."),
  lastName: z
    .string()
    .trim()
    .min(1, "Sobrenome é obrigatório.")
    .max(120, "Sobrenome deve ter no máximo 120 caracteres."),
  cpf: z.string().trim().min(11, "CPF inválido.").max(14, "CPF inválido."),
  phone: z
    .string()
    .trim()
    .min(8, "Telefone inválido.")
    .max(20, "Telefone inválido."),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z
    .string()
    .trim()
    .min(1, "Senha é obrigatória.")
    .max(100, "Senha inválida."),
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
