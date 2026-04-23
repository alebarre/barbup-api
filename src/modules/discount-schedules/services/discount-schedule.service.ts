import type { FastifyInstance } from "fastify";
import type { DiscountSchedule } from "@prisma/client";

import type {
  CreateDiscountScheduleInput,
  UpdateDiscountScheduleInput,
} from "../schemas/discount-schedule.schemas";

import { getWeekdayLabelPtBr } from "../../../shared/utils/weekday-label";

export class DiscountScheduleService {
  constructor(private readonly app: FastifyInstance) {}

  async list() {
    const items = await this.app.prisma.discountSchedule.findMany({
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return items.map((item) => this.toResponse(item));
  }

  async create(input: CreateDiscountScheduleInput) {
    const created = await this.app.prisma.discountSchedule.create({
      data: {
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        discountType: input.discountType,
        discountValue: input.discountValue,
        isActive: input.isActive ?? true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateDiscountScheduleInput) {
    const existing = await this.app.prisma.discountSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Faixa de desconto não encontrada.");
    }

    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;

    if (startTime >= endTime) {
      throw new Error("O horário final deve ser maior que o horário inicial.");
    }

    const updated = await this.app.prisma.discountSchedule.update({
      where: { id },
      data: {
        weekday: input.weekday ?? undefined,
        startTime: input.startTime ?? undefined,
        endTime: input.endTime ?? undefined,
        discountType: input.discountType ?? undefined,
        discountValue: input.discountValue ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.app.prisma.discountSchedule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Faixa de desconto não encontrada.");
    }

    await this.app.prisma.discountSchedule.delete({
      where: { id },
    });

    return {
      message: "Faixa de desconto removida com sucesso.",
      id,
    };
  }

  private toResponse(item: DiscountSchedule) {
    return {
      id: item.id,
      weekday: getWeekdayLabelPtBr(item.weekday),
      startTime: item.startTime,
      endTime: item.endTime,
      discountType: item.discountType,
      discountValue: Number(item.discountValue),
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
