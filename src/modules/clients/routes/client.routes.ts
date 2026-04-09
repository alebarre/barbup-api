import type { FastifyInstance } from "fastify";

import { ClientController } from "../controllers/client.controller";
import { ClientService } from "../services/client.service";

export async function clientRoutes(app: FastifyInstance) {
  const clientService = new ClientService(app);
  const clientController = new ClientController(clientService);

  app.get("/me", { preHandler: [app.authenticate] }, clientController.getMe);
  app.put("/me", { preHandler: [app.authenticate] }, clientController.updateMe);
  app.post(
    "/me/photo",
    { preHandler: [app.authenticate] },
    clientController.uploadPhoto,
  );
}
