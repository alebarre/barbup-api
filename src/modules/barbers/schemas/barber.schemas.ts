import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema = z
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

export const createBarberSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z
    .string()
    .trim()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(100, "A senha deve ter no máximo 100 caracteres."),
  displayName: z
    .string()
    .trim()
    .min(1, "Nome de exibição é obrigatório.")
    .max(160, "Nome de exibição deve ter no máximo 160 caracteres."),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio deve ter no máximo 2000 caracteres.")
    .optional()
    .nullable(),
  photoUrl: z
    .string()
    .trim()
    .max(500, "URL da foto deve ter no máximo 500 caracteres.")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
  availabilities: z.array(availabilitySchema).optional(),
});

export const updateBarberSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase().optional(),
  password: z
    .string()
    .trim()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(100, "A senha deve ter no máximo 100 caracteres.")
    .optional(),
  displayName: z
    .string()
    .trim()
    .min(1, "Nome de exibição é obrigatório.")
    .max(160, "Nome de exibição deve ter no máximo 160 caracteres.")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio deve ter no máximo 2000 caracteres.")
    .nullable()
    .optional(),
  photoUrl: z
    .string()
    .trim()
    .max(500, "URL da foto deve ter no máximo 500 caracteres.")
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
  availabilities: z.array(availabilitySchema).optional(),
});

export const barberIdParamSchema = z.object({
  id: z.uuid("ID inválido."),
});

export const availabilityQuerySchema = z.object({
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export type CreateBarberInput = z.infer<typeof createBarberSchema>;
export type UpdateBarberInput = z.infer<typeof updateBarberSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
