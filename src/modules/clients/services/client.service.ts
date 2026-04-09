import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import type { UpdateMeInput } from "../schemas/client.schemas";

export class ClientService {
  constructor(private readonly app: FastifyInstance) {}

  async getMe(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new Error("Perfil do cliente não encontrado.");
    }

    if (user.role !== UserRole.CLIENT) {
      throw new Error("Acesso permitido apenas para clientes.");
    }

    return this.toResponse(user, user.clientProfile);
  }

  async updateMe(userId: string, input: UpdateMeInput) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new Error("Perfil do cliente não encontrado.");
    }

    if (user.role !== UserRole.CLIENT) {
      throw new Error("Acesso permitido apenas para clientes.");
    }

    if (input.cpf && input.cpf !== user.clientProfile.cpf) {
      const cpfInUse = await this.app.prisma.clientProfile.findUnique({
        where: { cpf: input.cpf },
        select: { id: true },
      });

      if (cpfInUse) {
        throw new Error("CPF já cadastrado.");
      }
    }

    const updatedProfile = await this.app.prisma.clientProfile.update({
      where: { userId },
      data: {
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        cpf: input.cpf ?? undefined,
        phone: input.phone ?? undefined,
      },
    });

    return this.toResponse(user, updatedProfile);
  }

  async updatePhoto(userId: string, photoUrl: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new Error("Perfil do cliente não encontrado.");
    }

    if (user.role !== UserRole.CLIENT) {
      throw new Error("Acesso permitido apenas para clientes.");
    }

    const updatedProfile = await this.app.prisma.clientProfile.update({
      where: { userId },
      data: {
        photoUrl,
      },
    });

    return this.toResponse(user, updatedProfile);
  }

  private toResponse(
    user: {
      id: string;
      role: UserRole;
      email: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      cpf: string;
      phone: string;
      photoUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        cpf: profile.cpf,
        phone: profile.phone,
        photoUrl: profile.photoUrl,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }
}
