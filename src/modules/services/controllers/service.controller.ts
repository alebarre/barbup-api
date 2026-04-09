import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { ServiceService } from "../services/service.services";
import {
  createServiceSchema,
  serviceIdParamSchema,
  updateServiceSchema,
} from "../schemas/service.schemas";

export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.serviceService.list();
    return reply.status(200).send(result);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createServiceSchema.parse(request.body);
      const result = await this.serviceService.create(input);

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
        error instanceof Error ? error.message : "Erro ao criar serviço.";

      return reply.status(400).send({ message });
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = serviceIdParamSchema.parse(request.params);
      const input = updateServiceSchema.parse(request.body);

      const result = await this.serviceService.update(id, input);

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
        error instanceof Error ? error.message : "Erro ao atualizar serviço.";

      const statusCode = message === "Serviço não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = serviceIdParamSchema.parse(request.params);
      const result = await this.serviceService.remove(id);

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
        error instanceof Error ? error.message : "Erro ao remover serviço.";

      const statusCode = message === "Serviço não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };
}
