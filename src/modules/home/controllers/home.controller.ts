import type { FastifyReply, FastifyRequest } from "fastify";
import { HomeService } from "../services/home.service";

export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  getFeed = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.homeService.getFeed();
      return reply.status(200).send(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar feed da home.";

      return reply.status(500).send({ message });
    }
  };
}
