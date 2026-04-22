import { z } from "zod";

export const createLoyaltyProgramSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres."),
  ruleType: z.enum(["VISIT_COUNT", "AMOUNT_SPENT"]),
  targetCount: z.coerce
    .number()
    .int("Meta deve ser um número inteiro.")
    .min(1, "Meta deve ser maior que zero.")
    .max(999999, "Meta inválida."),
  rewardDescription: z
    .string()
    .trim()
    .min(1, "Descrição da recompensa é obrigatória.")
    .max(2000, "Descrição da recompensa deve ter no máximo 2000 caracteres."),
  isActive: z.boolean().optional(),
});

export const updateLoyaltyProgramSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres.")
    .optional(),
  ruleType: z.enum(["VISIT_COUNT", "AMOUNT_SPENT"]).optional(),
  targetCount: z.coerce
    .number()
    .int("Meta deve ser um número inteiro.")
    .min(1, "Meta deve ser maior que zero.")
    .max(999999, "Meta inválida.")
    .optional(),
  rewardDescription: z
    .string()
    .trim()
    .min(1, "Descrição da recompensa é obrigatória.")
    .max(2000, "Descrição da recompensa deve ter no máximo 2000 caracteres.")
    .optional(),
  isActive: z.boolean().optional(),
});

export const loyaltyProgramIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export type CreateLoyaltyProgramInput = z.infer<
  typeof createLoyaltyProgramSchema
>;
export type UpdateLoyaltyProgramInput = z.infer<
  typeof updateLoyaltyProgramSchema
>;
export type LoyaltyProgramIdParam = z.infer<typeof loyaltyProgramIdParamSchema>;