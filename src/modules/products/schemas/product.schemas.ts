import { z } from "zod";

export const createProductSchema = z.object({
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
  imageUrl: z
    .string()
    .trim()
    .max(500, "URL da imagem deve ter no máximo 500 caracteres.")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
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
  imageUrl: z
    .string()
    .trim()
    .max(500, "URL da imagem deve ter no máximo 500 caracteres.")
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

export const productIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
