import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { MembershipController } from "../controllers/membership.controller";
import { MembershipService } from "../services/membership.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function membershipRoutes(app: FastifyInstance) {
  const membershipService = new MembershipService(app);
  const membershipController = new MembershipController(membershipService);

  app.get("/", membershipController.listPlans);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    membershipController.createPlan,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    membershipController.updatePlan,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    membershipController.removePlan,
  );

  app.get(
    "/me",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    membershipController.getMyMemberships,
  );

  app.post(
    "/subscribe",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    membershipController.subscribe,
  );

  app.patch(
    "/me/cancel",
    {
      preHandler: [app.authenticate, requireRole(UserRole.CLIENT)],
    },
    membershipController.cancelMyMembership,
  );
}
