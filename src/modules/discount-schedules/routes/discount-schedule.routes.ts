import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { DiscountScheduleController } from "../controllers/discount-schedule.controller";
import { DiscountScheduleService } from "../services/discount-schedule.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function discountScheduleRoutes(app: FastifyInstance) {
  const discountScheduleService = new DiscountScheduleService(app);
  const discountScheduleController = new DiscountScheduleController(
    discountScheduleService,
  );

  app.get("/", discountScheduleController.list);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    discountScheduleController.create,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    discountScheduleController.update,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    discountScheduleController.remove,
  );
}
