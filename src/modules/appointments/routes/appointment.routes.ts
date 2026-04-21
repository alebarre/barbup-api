import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { AppointmentController } from "../controllers/appointment.controller";
import { AppointmentService } from "../services/appointment.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function appointmentRoutes(app: FastifyInstance) {
  const appointmentService = new AppointmentService(app);
  const appointmentController = new AppointmentController(appointmentService);

  app.get(
    "/me",
    {
      preHandler: [
        app.authenticate,
        requireRole(UserRole.CLIENT, UserRole.BARBER, UserRole.SUPER_ADMIN),
      ],
    },
    appointmentController.listMe,
  );

  app.get(
    "/:id",
    {
      preHandler: [
        app.authenticate,
        requireRole(UserRole.CLIENT, UserRole.BARBER, UserRole.SUPER_ADMIN),
      ],
    },
    appointmentController.getById,
  );

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    appointmentController.create,
  );

  app.patch(
    "/:id/cancel",
    {
      preHandler: [
        app.authenticate,
        requireRole(UserRole.CLIENT, UserRole.BARBER, UserRole.SUPER_ADMIN),
      ],
    },
    appointmentController.cancel,
  );

  app.patch(
    "/:id/accept",
    {
      preHandler: [
        app.authenticate,
        requireRole(UserRole.BARBER, UserRole.SUPER_ADMIN),
      ],
    },
    appointmentController.accept,
  );

  app.patch(
    "/:id/status",
    {
      preHandler: [
        app.authenticate,
        requireRole(UserRole.BARBER, UserRole.SUPER_ADMIN),
      ],
    },
    appointmentController.updateStatus,
  );
}
