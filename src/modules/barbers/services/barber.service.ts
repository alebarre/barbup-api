import type { FastifyInstance } from "fastify";
import { UserRole, type BarberProfile, type User } from "@prisma/client";

import { hashPassword } from "../../../shared/utils/password";
import type {
  AvailabilityQueryInput,
  CreateBarberInput,
  UpdateBarberInput,
} from "../schemas/barber.schemas";

type BarberWithRelations = BarberProfile & {
  user: User;
  availabilities: Array<{
    id: string;
    weekday: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
};

export class BarberService {
  constructor(private readonly app: FastifyInstance) {}

  async list() {
    const barbers = await this.app.prisma.barberProfile.findMany({
      include: {
        user: true,
        availabilities: {
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        },
      },
      orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    });

    return barbers.map((barber) => this.toResponse(barber));
  }

  async create(input: CreateBarberInput) {
    const emailInUse = await this.app.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (emailInUse) {
      throw new Error("E-mail já cadastrado.");
    }

    const created = await this.app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.BARBER,
          email: input.email,
          passwordHash: hashPassword(input.password),
          isActive: true,
        },
      });

      const barber = await tx.barberProfile.create({
        data: {
          userId: user.id,
          displayName: input.displayName,
          bio: input.bio ?? null,
          photoUrl: input.photoUrl ?? null,
          isActive: input.isActive ?? true,
          availabilities: input.availabilities?.length
            ? {
                create: input.availabilities.map((item) => ({
                  weekday: item.weekday,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  isActive: item.isActive ?? true,
                })),
              }
            : undefined,
        },
        include: {
          user: true,
          availabilities: {
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      });

      return barber;
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateBarberInput) {
    const existing = await this.app.prisma.barberProfile.findUnique({
      where: { id },
      include: {
        user: true,
        availabilities: true,
      },
    });

    if (!existing) {
      throw new Error("Barbeiro não encontrado.");
    }

    if (input.email && input.email !== existing.user.email) {
      const emailInUse = await this.app.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (emailInUse) {
        throw new Error("E-mail já cadastrado.");
      }
    }

    const updated = await this.app.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          email: input.email ?? undefined,
          passwordHash: input.password
            ? hashPassword(input.password)
            : undefined,
        },
      });

      await tx.barberProfile.update({
        where: { id },
        data: {
          displayName: input.displayName ?? undefined,
          bio: input.bio ?? undefined,
          photoUrl: input.photoUrl ?? undefined,
          isActive: input.isActive ?? undefined,
        },
      });

      if (input.availabilities) {
        await tx.barberAvailability.deleteMany({
          where: { barberId: id },
        });

        if (input.availabilities.length > 0) {
          await tx.barberAvailability.createMany({
            data: input.availabilities.map((item) => ({
              barberId: id,
              weekday: item.weekday,
              startTime: item.startTime,
              endTime: item.endTime,
              isActive: item.isActive ?? true,
            })),
          });
        }
      }

      return tx.barberProfile.findUniqueOrThrow({
        where: { id },
        include: {
          user: true,
          availabilities: {
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      });
    });

    return this.toResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.app.prisma.barberProfile.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!existing) {
      throw new Error("Barbeiro não encontrado.");
    }

    const appointmentsCount = await this.app.prisma.appointment.count({
      where: { barberId: id },
    });

    if (appointmentsCount > 0) {
      throw new Error(
        "Não é possível remover o barbeiro porque ele possui agendamentos vinculados.",
      );
    }

    await this.app.prisma.user.delete({
      where: { id: existing.userId },
    });

    return {
      message: "Barbeiro removido com sucesso.",
      id: existing.id,
      displayName: existing.displayName,
    };
  }

  async getAvailability(id: string, query: AvailabilityQueryInput) {
    const barber = await this.app.prisma.barberProfile.findUnique({
      where: { id },
      include: {
        availabilities: {
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!barber) {
      throw new Error("Barbeiro não encontrado.");
    }

    const startAt = this.parseDate(query.startAt) ?? new Date();
    const endAt =
      this.parseDate(query.endAt) ??
      new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (endAt <= startAt) {
      throw new Error("O intervalo informado é inválido.");
    }

    const timeOffs = await this.app.prisma.barberTimeOff.findMany({
      where: {
        barberId: id,
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
      },
      orderBy: [{ startAt: "asc" }],
    });

    return {
      barber: {
        id: barber.id,
        displayName: barber.displayName,
        photoUrl: barber.photoUrl,
        bio: barber.bio,
        isActive: barber.isActive,
      },
      weeklyAvailabilities: barber.availabilities.map((item) => ({
        id: item.id,
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        isActive: item.isActive,
      })),
      timeOffs: timeOffs.map((item) => ({
        id: item.id,
        startAt: item.startAt,
        endAt: item.endAt,
        reason: item.reason,
        createdAt: item.createdAt,
      })),
      range: {
        startAt,
        endAt,
      },
    };
  }

  private parseDate(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toResponse(barber: BarberWithRelations) {
    return {
      id: barber.id,
      userId: barber.userId,
      email: barber.user.email,
      role: barber.user.role,
      displayName: barber.displayName,
      photoUrl: barber.photoUrl,
      bio: barber.bio,
      isActive: barber.isActive,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
      availabilities: barber.availabilities.map((item) => ({
        id: item.id,
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        isActive: item.isActive,
      })),
    };
  }
}
