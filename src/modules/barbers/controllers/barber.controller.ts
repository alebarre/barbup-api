import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { BarberService } from "../services/barber.service";
import {
  availabilityQuerySchema,
  barberIdParamSchema,
  createBarberSchema,
  updateBarberSchema,
} from "../schemas/barber.schemas";

export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.barberService.list();
    return reply.status(200).send(result);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createBarberSchema.parse(request.body);
      const result = await this.barberService.create(input);

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
        error instanceof Error ? error.message : "Erro ao criar barbeiro.";

      return reply.status(400).send({ message });
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = barberIdParamSchema.parse(request.params);
      const input = updateBarberSchema.parse(request.body);
      const result = await this.barberService.update(id, input);

      return reply.status(200).send(result);
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
        error instanceof Error ? error.message : "Erro ao atualizar barbeiro.";

      const statusCode = message === "Barbeiro não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = barberIdParamSchema.parse(request.params);
      const result = await this.barberService.remove(id);

      return reply.status(200).send(result);
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
        error instanceof Error ? error.message : "Erro ao remover barbeiro.";

      const statusCode = message === "Barbeiro não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  availability = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = barberIdParamSchema.parse(request.params);
      const query = availabilityQuerySchema.parse(request.query);
      const result = await this.barberService.getAvailability(id, query);

      return reply.status(200).send(result);
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
        error instanceof Error
          ? error.message
          : "Erro ao consultar disponibilidade do barbeiro.";

      const statusCode = message === "Barbeiro não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };
}