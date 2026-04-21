import type { FastifyInstance } from "fastify";
import { HomeController } from "../controllers/home.controller";
import { HomeService } from "../services/home.service";

export async function homeRoutes(app: FastifyInstance) {
  const homeService = new HomeService(app);
  const homeController = new HomeController(homeService);

  app.get("/feed", homeController.getFeed);
}
