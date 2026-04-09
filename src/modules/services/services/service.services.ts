import type { FastifyInstance } from "fastify";
import type { Service } from "@prisma/client";

import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "../schemas/service.schemas";

export class ServiceService {
  constructor(private readonly app: FastifyInstance) {}

  async list() {
    const services = await this.app.prisma.service.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return services.map((service) => this.toResponse(service));
  }

  async create(input: CreateServiceInput) {
    const existing = await this.app.prisma.service.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe um serviço com esse nome.");
    }

    const created = await this.app.prisma.service.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        durationMinutes: input.durationMinutes,
        isActive: input.isActive ?? true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateServiceInput) {
    const existing = await this.app.prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Serviço não encontrado.");
    }

    if (input.name && input.name !== existing.name) {
      const nameInUse = await this.app.prisma.service.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: input.name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (nameInUse) {
        throw new Error("Já existe um serviço com esse nome.");
      }
    }

    const updated = await this.app.prisma.service.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        price: input.price ?? undefined,
        durationMinutes: input.durationMinutes ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.app.prisma.service.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new Error("Serviço não encontrado.");
    }

    await this.app.prisma.service.delete({
      where: { id },
    });

    return {
      message: "Serviço removido com sucesso.",
      id: existing.id,
      name: existing.name,
    };
  }

  private toResponse(service: Service) {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: Number(service.price),
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
