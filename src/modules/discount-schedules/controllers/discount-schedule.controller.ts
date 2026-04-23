import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { DiscountScheduleService } from "../services/discount-schedule.service";
import {
  createDiscountScheduleSchema,
  discountScheduleIdParamSchema,
  updateDiscountScheduleSchema,
} from "../schemas/discount-schedule.schemas";

export class DiscountScheduleController {
  constructor(
    private readonly discountScheduleService: DiscountScheduleService,
  ) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.discountScheduleService.list();
    return reply.status(200).send(result);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createDiscountScheduleSchema.parse(request.body);
      const result = await this.discountScheduleService.create(input);

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao criar faixa de desconto.");
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = discountScheduleIdParamSchema.parse(request.params);
      const input = updateDiscountScheduleSchema.parse(request.body);
      const result = await this.discountScheduleService.update(id, input);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(
        reply,
        error,
        "Erro ao atualizar faixa de desconto.",
      );
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = discountScheduleIdParamSchema.parse(request.params);
      const result = await this.discountScheduleService.remove(id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(
        reply,
        error,
        "Erro ao remover faixa de desconto.",
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
      message === "Faixa de desconto não encontrada." ? 404 : 400;

    return reply.status(statusCode).send({ message });
  }
}
