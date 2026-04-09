import type { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  sub: string;
  role: UserRole;
  email: string;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

export {};
