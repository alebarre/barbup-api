import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import type { LoginInput, RegisterClientInput } from "../schemas/auth.schemas";
import { hashPassword, verifyPassword } from "../../../shared/utils/password";

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async registerClient(input: RegisterClientInput) {
    const existingUser = await this.app.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("E-mail já cadastrado.");
    }

    const existingCpf = await this.app.prisma.clientProfile.findUnique({
      where: { cpf: input.cpf },
      select: { id: true },
    });

    if (existingCpf) {
      throw new Error("CPF já cadastrado.");
    }

    const passwordHash = hashPassword(input.password);

    const created = await this.app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.CLIENT,
          email: input.email,
          passwordHash,
          isActive: true,
        },
      });

      const clientProfile = await tx.clientProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          cpf: input.cpf,
          phone: input.phone,
        },
      });

      return { user, clientProfile };
    });

    const token = await this.app.jwt.sign({
      sub: created.user.id,
      role: created.user.role,
      email: created.user.email,
    });

    return {
      token,
      user: {
        id: created.user.id,
        role: created.user.role,
        email: created.user.email,
        isActive: created.user.isActive,
      },
      profile: {
        id: created.clientProfile.id,
        firstName: created.clientProfile.firstName,
        lastName: created.clientProfile.lastName,
        cpf: created.clientProfile.cpf,
        phone: created.clientProfile.phone,
        photoUrl: created.clientProfile.photoUrl,
      },
    };
  }

  async login(input: LoginInput) {
    const user = await this.app.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        clientProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new Error("Credenciais inválidas.");
    }

    if (!user.isActive) {
      throw new Error("Usuário inativo.");
    }

    const isValidPassword = verifyPassword(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error("Credenciais inválidas.");
    }

    const token = await this.app.jwt.sign({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
      },
      profile:
        user.role === UserRole.CLIENT
          ? {
              id: user.clientProfile?.id ?? null,
              firstName: user.clientProfile?.firstName ?? null,
              lastName: user.clientProfile?.lastName ?? null,
              cpf: user.clientProfile?.cpf ?? null,
              phone: user.clientProfile?.phone ?? null,
              photoUrl: user.clientProfile?.photoUrl ?? null,
            }
          : {
              id: user.barberProfile?.id ?? null,
              displayName: user.barberProfile?.displayName ?? null,
              photoUrl: user.barberProfile?.photoUrl ?? null,
              bio: user.barberProfile?.bio ?? null,
            },
    };
  }

  async me(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    return {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile:
        user.role === UserRole.CLIENT
          ? {
              id: user.clientProfile?.id ?? null,
              firstName: user.clientProfile?.firstName ?? null,
              lastName: user.clientProfile?.lastName ?? null,
              cpf: user.clientProfile?.cpf ?? null,
              phone: user.clientProfile?.phone ?? null,
              photoUrl: user.clientProfile?.photoUrl ?? null,
              createdAt: user.clientProfile?.createdAt ?? null,
              updatedAt: user.clientProfile?.updatedAt ?? null,
            }
          : {
              id: user.barberProfile?.id ?? null,
              displayName: user.barberProfile?.displayName ?? null,
              photoUrl: user.barberProfile?.photoUrl ?? null,
              bio: user.barberProfile?.bio ?? null,
              isActive: user.barberProfile?.isActive ?? null,
              createdAt: user.barberProfile?.createdAt ?? null,
              updatedAt: user.barberProfile?.updatedAt ?? null,
            },
    };
  }
}
