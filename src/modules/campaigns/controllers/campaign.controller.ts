import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { CampaignService } from "../services/campaign.service";
import { createCampaignSchema } from "../schemas/campaing.schemas";

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.campaignService.list();
      return reply.status(200).send(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao listar campanhas.";
      return reply.status(500).send({ message });
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createCampaignSchema.parse(request.body);
      const result = await this.campaignService.create(request.user.sub, input);

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
        error instanceof Error ? error.message : "Erro ao criar campanha.";

      const statusCode =
        message === "Usuário criador não encontrado." ? 404 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const input = createCampaignSchema.parse(request.body);
      const result = await this.campaignService.update(id, input);
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
        error instanceof Error ? error.message : "Erro ao atualizar campanha.";
      return reply.status(500).send({ message });
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { title } = request.body as { title: string };
    try {
      await this.campaignService.delete(id);
      const message = `Campanha "${title}" deletada com sucesso.`;
      return reply.status(204).send({ message });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao deletar campanha.";
      return reply.status(500).send({ message });
    }
  };
  
}
