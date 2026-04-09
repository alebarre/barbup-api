import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AuthService } from "../services/auth.service";
import { loginSchema, registerClientSchema } from "../schemas/auth.schemas";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  registerClient = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = registerClientSchema.parse(request.body);
      const result = await this.authService.registerClient(input);

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: "Dados inválidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const message =
        error instanceof Error ? error.message : "Erro ao registrar cliente.";

      return reply.status(400).send({ message });
    }
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = loginSchema.parse(request.body);
      const result = await this.authService.login(input);

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: "Dados inválidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const message =
        error instanceof Error ? error.message : "Erro ao realizar login.";

      const statusCode = message === "Credenciais inválidas." ? 401 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user.sub;
      const result = await this.authService.me(userId);

      return reply.status(200).send(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao obter usuário autenticado.";

      return reply.status(404).send({ message });
    }
  };
}
