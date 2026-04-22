import type { FastifyInstance } from "fastify";
import {
  UserRole,
  type LoyaltyEntry,
  type LoyaltyProgram,
  type MembershipPlan,
} from "@prisma/client";

import type {
  CreateLoyaltyProgramInput,
  UpdateLoyaltyProgramInput,
} from "../../loyalty/schemas/loualty.schemas";

type LoyaltyProgramResponse = {
  id: string;
  name: string;
  ruleType: string;
  targetCount: number;
  rewardDescription: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class LoyaltyService {
  constructor(private readonly app: FastifyInstance) {}

  async listPrograms() {
    const programs = await this.app.prisma.loyaltyProgram.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    return programs.map((program) => this.toProgramResponse(program));
  }

  async createProgram(input: CreateLoyaltyProgramInput) {
    const existing = await this.app.prisma.loyaltyProgram.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe um programa de fidelidade com esse nome.");
    }

    const created = await this.app.prisma.loyaltyProgram.create({
      data: {
        name: input.name,
        ruleType: input.ruleType,
        targetCount: input.targetCount,
        rewardDescription: input.rewardDescription,
        isActive: input.isActive ?? true,
      },
    });

    return this.toProgramResponse(created);
  }

  async updateProgram(id: string, input: UpdateLoyaltyProgramInput) {
    const existing = await this.app.prisma.loyaltyProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Programa de fidelidade não encontrado.");
    }

    if (input.name && input.name !== existing.name) {
      const nameInUse = await this.app.prisma.loyaltyProgram.findFirst({
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
        throw new Error("Já existe um programa de fidelidade com esse nome.");
      }
    }

    const updated = await this.app.prisma.loyaltyProgram.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        ruleType: input.ruleType ?? undefined,
        targetCount: input.targetCount ?? undefined,
        rewardDescription: input.rewardDescription ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toProgramResponse(updated);
  }

  async removeProgram(id: string) {
    const existing = await this.app.prisma.loyaltyProgram.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new Error("Programa de fidelidade não encontrado.");
    }

    await this.app.prisma.loyaltyProgram.delete({
      where: { id },
    });

    return {
      message: "Programa de fidelidade removido com sucesso.",
      id: existing.id,
      name: existing.name,
    };
  }

  async getMySummary(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new Error("Cliente não encontrado.");
    }

    if (user.role !== UserRole.CLIENT) {
      throw new Error("Apenas clientes podem consultar fidelidade.");
    }

    const [entries, activePrograms] = await Promise.all([
      this.app.prisma.loyaltyEntry.findMany({
        where: {
          clientId: user.clientProfile.id,
        },
        include: {
          appointment: true,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      this.app.prisma.loyaltyProgram.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

    const totalPoints = entries.reduce((sum, entry) => sum + entry.points, 0);
    const currentProgram = activePrograms[0] ?? null;

    return {
      client: {
        id: user.clientProfile.id,
        firstName: user.clientProfile.firstName,
        lastName: user.clientProfile.lastName,
      },
      currentProgram: currentProgram
        ? this.toProgramResponse(currentProgram)
        : null,
      totalPoints,
      totalEntries: entries.length,
      progress: currentProgram
        ? {
            current: totalPoints,
            target: currentProgram.targetCount,
            remaining: Math.max(currentProgram.targetCount - totalPoints, 0),
            completed: totalPoints >= currentProgram.targetCount,
            rewardDescription: currentProgram.rewardDescription,
          }
        : null,
      recentEntries: entries.slice(0, 10).map((entry) => ({
        id: entry.id,
        appointmentId: entry.appointmentId,
        points: entry.points,
        createdAt: entry.createdAt,
      })),
    };
  }

  async getMyHistory(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new Error("Cliente não encontrado.");
    }

    if (user.role !== UserRole.CLIENT) {
      throw new Error("Apenas clientes podem consultar fidelidade.");
    }

    const entries = await this.app.prisma.loyaltyEntry.findMany({
      where: {
        clientId: user.clientProfile.id,
      },
      include: {
        appointment: {
          include: {
            barber: true,
            services: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return entries.map((entry) => ({
      id: entry.id,
      points: entry.points,
      createdAt: entry.createdAt,
      appointment: {
        id: entry.appointment.id,
        barberId: entry.appointment.barberId,
        barberName: entry.appointment.barber.displayName,
        startAt: entry.appointment.startAt,
        endAt: entry.appointment.endAt,
        status: entry.appointment.status,
        totalAmount: Number(entry.appointment.totalAmount),
      },
    }));
  }

  async awardPointsForCompletedAppointment(appointmentId: string) {
    const appointment = await this.app.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
      },
    });

    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    if (appointment.status !== "COMPLETED") {
      return null;
    }

    const existingEntry = await this.app.prisma.loyaltyEntry.findUnique({
      where: { appointmentId: appointment.id },
    });

    if (existingEntry) {
      return existingEntry;
    }

    const activeProgram = await this.app.prisma.loyaltyProgram.findFirst({
      where: {
        isActive: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    if (!activeProgram) {
      return null;
    }

    const points =
      activeProgram.ruleType === "VISIT_COUNT"
        ? 1
        : Math.max(Math.floor(Number(appointment.totalAmount)), 1);

    return this.app.prisma.loyaltyEntry.create({
      data: {
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        points,
      },
    });
  }

  private toProgramResponse(program: LoyaltyProgram): LoyaltyProgramResponse {
    return {
      id: program.id,
      name: program.name,
      ruleType: program.ruleType,
      targetCount: program.targetCount,
      rewardDescription: program.rewardDescription,
      isActive: program.isActive,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }
}
