import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { CampaignController } from "../controllers/campaign.controller";
import { CampaignService } from "../services/campaign.service";
import { requireRole } from "../../../shared/guards/roles.guard";
import { createCampaignSchema } from "../schemas/campaing.schemas";
import { ZodError } from "zod";

export async function campaignRoutes(app: FastifyInstance) {
  const campaignService = new CampaignService(app);
  const campaignController = new CampaignController(campaignService);

  app.get(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    campaignController.list,
  );

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    campaignController.create,
  );

    app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { title } = request.body as { title: string };
      try {
        await campaignService.delete(id);
        const message = `Campanha "${title}" deletada com sucesso.`;
        return reply.status(204).send({ message });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao deletar campanha.";
        return reply.status(500).send({ message });
      }
    },
  );

    app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
        try {          const input = createCampaignSchema.parse(request.body);
          const result = await campaignService.update(id, input);
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
    },
  );

}
