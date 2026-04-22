import { z } from "zod";

export const createMembershipPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres."),
  monthlyPrice: z.coerce
    .number()
    .positive("Preço mensal deve ser maior que zero.")
    .max(999999.99, "Preço mensal inválido."),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export const updateMembershipPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres.")
    .optional(),
  monthlyPrice: z.coerce
    .number()
    .positive("Preço mensal deve ser maior que zero.")
    .max(999999.99, "Preço mensal inválido.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

export const membershipPlanIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export const subscribeMembershipSchema = z.object({
  membershipPlanId: z.uuid("Plano inválido."),
  startDate: z.string().datetime("Data inicial inválida.").optional(),
});

export type CreateMembershipPlanInput = z.infer<
  typeof createMembershipPlanSchema
>;
export type UpdateMembershipPlanInput = z.infer<
  typeof updateMembershipPlanSchema
>;
export type SubscribeMembershipInput = z.infer<
  typeof subscribeMembershipSchema
>;
