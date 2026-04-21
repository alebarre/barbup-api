import type { FastifyInstance } from "fastify";
import type { Promotion } from "@prisma/client";

import type {
  CreatePromotionInput,
  UpdatePromotionInput,
} from "../schemas/promotion.schemas";

export class PromotionService {
  constructor(private readonly app: FastifyInstance) {}

  async listActive() {
    const now = new Date();

    const promotions = await this.app.prisma.promotion.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: [{ startAt: "asc" }, { title: "asc" }],
    });

    return promotions.map((promotion) => this.toResponse(promotion));
  }

  async create(input: CreatePromotionInput) {
    const created = await this.app.prisma.promotion.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        value: input.value,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        isActive: input.isActive ?? true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdatePromotionInput) {
    const existing = await this.app.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Promoção não encontrada.");
    }

    const startAt = input.startAt ? new Date(input.startAt) : existing.startAt;
    const endAt = input.endAt ? new Date(input.endAt) : existing.endAt;

    if (endAt <= startAt) {
      throw new Error("A data/hora final deve ser maior que a inicial.");
    }

    const updated = await this.app.prisma.promotion.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        description: input.description ?? undefined,
        type: input.type ?? undefined,
        value: input.value ?? undefined,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.app.prisma.promotion.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      throw new Error("Promoção não encontrada.");
    }

    await this.app.prisma.promotion.delete({
      where: { id },
    });

    return {
      message: "Promoção removida com sucesso.",
      id: existing.id,
      title: existing.title,
    };
  }

  private toResponse(promotion: Promotion) {
    return {
      id: promotion.id,
      title: promotion.title,
      description: promotion.description,
      type: promotion.type,
      value: Number(promotion.value),
      startAt: promotion.startAt,
      endAt: promotion.endAt,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }
}
