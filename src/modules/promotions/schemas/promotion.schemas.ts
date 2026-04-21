import { z } from "zod";

export const createPromotionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Título é obrigatório.")
      .max(180, "Título deve ter no máximo 180 caracteres."),
    description: z
      .string()
      .trim()
      .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
      .optional()
      .nullable(),
    type: z.enum([
      "PERCENTAGE",
      "FIXED_AMOUNT",
      "SERVICE_OVERRIDE",
      "TIME_WINDOW",
    ]),
    value: z.coerce
      .number()
      .positive("Valor deve ser maior que zero.")
      .max(999999.99, "Valor inválido."),
    startAt: z.string().datetime("Data/hora inicial inválida."),
    endAt: z.string().datetime("Data/hora final inválida."),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const startAt = new Date(value.startAt);
    const endAt = new Date(value.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return;
    }

    if (endAt <= startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "A data/hora final deve ser maior que a inicial.",
      });
    }
  });

export const updatePromotionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Título é obrigatório.")
      .max(180, "Título deve ter no máximo 180 caracteres.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
      .nullable()
      .optional(),
    type: z
      .enum(["PERCENTAGE", "FIXED_AMOUNT", "SERVICE_OVERRIDE", "TIME_WINDOW"])
      .optional(),
    value: z.coerce
      .number()
      .positive("Valor deve ser maior que zero.")
      .max(999999.99, "Valor inválido.")
      .optional(),
    startAt: z.string().datetime("Data/hora inicial inválida.").optional(),
    endAt: z.string().datetime("Data/hora final inválida.").optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.startAt || !value.endAt) return;

    const startAt = new Date(value.startAt);
    const endAt = new Date(value.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return;
    }

    if (endAt <= startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "A data/hora final deve ser maior que a inicial.",
      });
    }
  });

export const promotionIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
