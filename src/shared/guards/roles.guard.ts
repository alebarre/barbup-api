import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!request.user) {
      return reply.status(401).send({
        message: "Não autenticado.",
      });
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        message: "Acesso negado.",
      });
    }
  };
}
