import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { LoyaltyController } from "../controllers/loyalty.controller";
import { LoyaltyService } from "../../loyalty/services/loyalty.services";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function loyaltyRoutes(app: FastifyInstance) {
  const loyaltyService = new LoyaltyService(app);
  const loyaltyController = new LoyaltyController(loyaltyService);

  app.get("/programs", loyaltyController.listPrograms);

  app.post(
    "/programs",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    loyaltyController.createProgram,
  );

  app.put(
    "/programs/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    loyaltyController.updateProgram,
  );

  app.delete(
    "/programs/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    loyaltyController.removeProgram,
  );

  app.get(
    "/me",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    loyaltyController.getMySummary,
  );

  app.get(
    "/me/history",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    loyaltyController.getMyHistory,
  );
}
