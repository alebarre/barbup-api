import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { ServiceController } from "../controllers/service.controller";
import { ServiceService } from "../services/service.services";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function serviceRoutes(app: FastifyInstance) {
  const serviceService = new ServiceService(app);
  const serviceController = new ServiceController(serviceService);

  app.get("/", serviceController.list);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    serviceController.create,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    serviceController.update,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    serviceController.remove,
  );
}
