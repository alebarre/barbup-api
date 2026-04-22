import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { LoyaltyService } from "../../loyalty/services/loyalty.services";
import {
  createLoyaltyProgramSchema,
  loyaltyProgramIdParamSchema,
  updateLoyaltyProgramSchema,
} from "../../loyalty/schemas/loualty.schemas";

export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  listPrograms = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.loyaltyService.listPrograms();
    return reply.status(200).send(result);
  };

  createProgram = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createLoyaltyProgramSchema.parse(request.body);
      const result = await this.loyaltyService.createProgram(input);

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao criar programa.");
    }
  };

  updateProgram = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = loyaltyProgramIdParamSchema.parse(request.params);
      const input = updateLoyaltyProgramSchema.parse(request.body);
      const result = await this.loyaltyService.updateProgram(id, input);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao atualizar programa.");
    }
  };

  removeProgram = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = loyaltyProgramIdParamSchema.parse(request.params);
      const result = await this.loyaltyService.removeProgram(id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao remover programa.");
    }
  };

  getMySummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.loyaltyService.getMySummary(request.user.sub);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao consultar fidelidade.");
    }
  };

  getMyHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.loyaltyService.getMyHistory(request.user.sub);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao consultar histórico.");
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
      message === "Programa de fidelidade não encontrado." ||
      message === "Cliente não encontrado."
        ? 404
        : message.includes("Apenas clientes")
          ? 403
          : 400;

    return reply.status(statusCode).send({ message });
  }
}
