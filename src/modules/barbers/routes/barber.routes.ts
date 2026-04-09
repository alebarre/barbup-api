import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { BarberController } from "../../barbers/controllers/barber.controller";
import { BarberService } from "../services/barber.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function barberRoutes(app: FastifyInstance) {
  const barberService = new BarberService(app);
  const barberController = new BarberController(barberService);

  app.get("/", barberController.list);
  app.get("/:id/availability", barberController.availability);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    barberController.create,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    barberController.update,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    barberController.remove,
  );
}
