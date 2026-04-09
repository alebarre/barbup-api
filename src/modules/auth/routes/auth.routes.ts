import type { FastifyInstance } from "fastify";

import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);
  const authController = new AuthController(authService);

  app.post("/register/client", authController.registerClient);
  app.post("/login", authController.login);
  app.get("/me", { preHandler: [app.authenticate] }, authController.me);
}
