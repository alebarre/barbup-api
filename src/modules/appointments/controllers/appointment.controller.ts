import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AppointmentService } from "../services/appointment.service";
import { createAppointmentSchema } from "../../appointments/schemas/appoitments.schemas";

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createAppointmentSchema.parse(request.body);
      const result = await this.appointmentService.create(
        request.user.sub,
        input,
      );

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: "Dados inválidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const message =
        error instanceof Error ? error.message : "Erro ao criar agendamento.";

      const statusCode =
        message === "Cliente não encontrado." ||
        message === "Barbeiro não encontrado."
          ? 404
          : 400;

      return reply.status(statusCode).send({ message });
    }
  };
}
