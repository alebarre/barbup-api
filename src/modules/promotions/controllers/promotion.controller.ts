import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { PromotionService } from "../services/promotion.service";
import {
  createPromotionSchema,
  promotionIdParamSchema,
  updatePromotionSchema,
} from "../schemas/promotion.schemas";

export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.promotionService.list();
    return reply.status(200).send(result);
  };

  listActive = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.promotionService.listActive();
    return reply.status(200).send(result);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createPromotionSchema.parse(request.body);
      const result = await this.promotionService.create(input);

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao criar promoção.");
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = promotionIdParamSchema.parse(request.params);
      const input = updatePromotionSchema.parse(request.body);
      const result = await this.promotionService.update(id, input);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao atualizar promoção.");
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = promotionIdParamSchema.parse(request.params);
      const result = await this.promotionService.remove(id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao remover promoção.");
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
    const statusCode = message === "Promoção não encontrada." ? 404 : 400;

    return reply.status(statusCode).send({ message });
  }
}
