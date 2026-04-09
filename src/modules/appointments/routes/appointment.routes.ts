import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { AppointmentController } from "../controllers/appointment.controller";
import { AppointmentService } from "../services/appointment.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function appointmentRoutes(app: FastifyInstance) {
  const appointmentService = new AppointmentService(app);
  const appointmentController = new AppointmentController(appointmentService);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    appointmentController.create,
  );
}
