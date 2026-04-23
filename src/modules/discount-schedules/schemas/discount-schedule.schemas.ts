import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createDiscountScheduleSchema = z
  .object({
    weekday: z.enum([
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ]),
    startTime: z
      .string()
      .regex(timeRegex, "Horário inicial inválido. Use HH:mm."),
    endTime: z.string().regex(timeRegex, "Horário final inválido. Use HH:mm."),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce
      .number()
      .positive("Valor do desconto deve ser maior que zero.")
      .max(999999.99, "Valor do desconto inválido."),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "O horário final deve ser maior que o horário inicial.",
      });
    }
  });

export const updateDiscountScheduleSchema = z.object({
  weekday: z
    .enum([
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ])
    .optional(),
  startTime: z
    .string()
    .regex(timeRegex, "Horário inicial inválido. Use HH:mm.")
    .optional(),
  endTime: z
    .string()
    .regex(timeRegex, "Horário final inválido. Use HH:mm.")
    .optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  discountValue: z.coerce
    .number()
    .positive("Valor do desconto deve ser maior que zero.")
    .max(999999.99, "Valor do desconto inválido.")
    .optional(),
  isActive: z.boolean().optional(),
});

export const discountScheduleIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export type CreateDiscountScheduleInput = z.infer<
  typeof createDiscountScheduleSchema
>;
export type UpdateDiscountScheduleInput = z.infer<
  typeof updateDiscountScheduleSchema
>;
export type DiscountScheduleIdParam = z.infer<typeof discountScheduleIdParamSchema>;