import { z } from "zod";

export const createAppointmentSchema = z.object({
  barberId: z.uuid("Barbeiro inválido."),
  startAt: z.string().datetime("Data/hora inicial inválida."),
  serviceIds: z
    .array(z.uuid("Serviço inválido."))
    .min(1, "Selecione pelo menos um serviço."),
  paymentMethod: z.enum(["PIX", "CREDIT", "DEBIT", "PAY_LATER"]),
  notes: z
    .string()
    .trim()
    .max(2000, "Observações devem ter no máximo 2000 caracteres.")
    .optional()
    .nullable(),
});

export const appointmentIdParamSchema = z.object({
  id: z.uuid("ID de agendamento inválido."),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "ACCEPTED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
  ]),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;
