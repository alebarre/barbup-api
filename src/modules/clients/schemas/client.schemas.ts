import { z } from "zod";

export const updateMeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(120, "Nome deve ter no máximo 120 caracteres.")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Sobrenome é obrigatório.")
    .max(120, "Sobrenome deve ter no máximo 120 caracteres.")
    .optional(),
  cpf: z
    .string()
    .trim()
    .min(11, "CPF inválido.")
    .max(14, "CPF inválido.")
    .optional(),
  phone: z
    .string()
    .trim()
    .min(8, "Telefone inválido.")
    .max(20, "Telefone inválido.")
    .optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
