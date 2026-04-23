import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { PromotionController } from "../controllers/promotion.controller";
import { PromotionService } from "../services/promotion.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function promotionRoutes(app: FastifyInstance) {
  const promotionService = new PromotionService(app);
  const promotionController = new PromotionController(promotionService);

  app.get("/", promotionController.list);
  app.get("/active", promotionController.listActive);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    promotionController.create,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    promotionController.update,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    promotionController.remove,
  );
}
