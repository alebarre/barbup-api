import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AppointmentService } from "../services/appointment.service";
import {
  appointmentIdParamSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../../appointments/schemas/appoitments.schemas";

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
      return this.handleError(reply, error, "Erro ao criar agendamento.");
    }
  };

  listMe = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.appointmentService.listForMe(request.user.sub);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao listar agendamentos.");
    }
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = appointmentIdParamSchema.parse(request.params);
      const result = await this.appointmentService.getById(
        request.user.sub,
        id,
      );

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao obter agendamento.");
    }
  };

  cancel = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = appointmentIdParamSchema.parse(request.params);
      const result = await this.appointmentService.cancel(request.user.sub, id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao cancelar agendamento.");
    }
  };

  accept = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = appointmentIdParamSchema.parse(request.params);
      const result = await this.appointmentService.accept(request.user.sub, id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao aceitar agendamento.");
    }
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = appointmentIdParamSchema.parse(request.params);
      const input = updateAppointmentStatusSchema.parse(request.body);

      const result = await this.appointmentService.updateStatus(
        request.user.sub,
        id,
        input,
      );

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(
        reply,
        error,
        "Erro ao atualizar status do agendamento.",
      );
    }
  };

  private handleError(reply: FastifyReply, error: unknown, fallback: string) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Dados inválidos.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : fallback;

    const statusCode =
      message === "Agendamento não encontrado." ||
      message === "Cliente não encontrado." ||
      message === "Barbeiro não encontrado." ||
      message === "Usuário não encontrado."
        ? 404
        : message.includes("Acesso negado") ||
            message.includes("não pode") ||
            message.includes("Apenas clientes")
          ? 403
          : 400;

    return reply.status(statusCode).send({ message });
  }
}
