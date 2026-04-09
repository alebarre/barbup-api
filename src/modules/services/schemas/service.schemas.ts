import { z } from "zod";

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres."),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
    .optional()
    .nullable(),
  price: z.coerce
    .number()
    .positive("Preço deve ser maior que zero.")
    .max(999999.99, "Preço inválido."),
  durationMinutes: z.coerce
    .number()
    .int("Duração deve ser um número inteiro.")
    .min(5, "Duração mínima é 5 minutos.")
    .max(480, "Duração máxima é 480 minutos."),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(160, "Nome deve ter no máximo 160 caracteres.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
    .nullable()
    .optional(),
  price: z.coerce
    .number()
    .positive("Preço deve ser maior que zero.")
    .max(999999.99, "Preço inválido.")
    .optional(),
  durationMinutes: z.coerce
    .number()
    .int("Duração deve ser um número inteiro.")
    .min(5, "Duração mínima é 5 minutos.")
    .max(480, "Duração máxima é 480 minutos.")
    .optional(),
  isActive: z.boolean().optional(),
});

export const serviceIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceIdParamInput = z.infer<typeof serviceIdParamSchema>;
