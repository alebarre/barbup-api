import type { FastifyInstance } from "fastify";
import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
  type PaymentMethod,
} from "@prisma/client";

import type { CreateAppointmentInput } from "../../appointments/schemas/appoitments.schemas";

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ACCEPTED,
];

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export class AppointmentService {
  constructor(private readonly app: FastifyInstance) {}

  async create(clientUserId: string, input: CreateAppointmentInput) {
    const clientUser = await this.app.prisma.user.findUnique({
      where: { id: clientUserId },
      include: {
        clientProfile: true,
      },
    });

    if (!clientUser || !clientUser.clientProfile) {
      throw new Error("Cliente não encontrado.");
    }

    if (clientUser.role !== UserRole.CLIENT) {
      throw new Error("Apenas clientes podem criar agendamentos.");
    }

    const barber = await this.app.prisma.barberProfile.findUnique({
      where: { id: input.barberId },
      include: {
        user: true,
        availabilities: {
          where: { isActive: true },
        },
      },
    });

    if (!barber || !barber.user) {
      throw new Error("Barbeiro não encontrado.");
    }

    if (!barber.isActive || !barber.user.isActive) {
      throw new Error("Barbeiro indisponível.");
    }

    const uniqueServiceIds = [...new Set(input.serviceIds)];

    const services = await this.app.prisma.service.findMany({
      where: {
        id: { in: uniqueServiceIds },
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    if (services.length !== uniqueServiceIds.length) {
      throw new Error("Um ou mais serviços são inválidos ou estão inativos.");
    }

    const startAt = new Date(input.startAt);

    if (Number.isNaN(startAt.getTime())) {
      throw new Error("Data/hora inicial inválida.");
    }

    const now = new Date();
    if (startAt <= now) {
      throw new Error("O agendamento deve ser criado para um horário futuro.");
    }

    const totalDurationMinutes = services.reduce(
      (sum, service) => sum + service.durationMinutes,
      0,
    );

    const subtotal = services.reduce(
      (sum, service) => sum + Number(service.price),
      0,
    );

    const discountAmount = 0;
    const totalAmount = subtotal - discountAmount;

    const endAt = new Date(
      startAt.getTime() + totalDurationMinutes * 60 * 1000,
    );

    await this.ensureWithinAvailability(
      barber.id,
      barber.availabilities,
      startAt,
      endAt,
    );
    await this.ensureNotInTimeOff(barber.id, startAt, endAt);
    await this.ensureNoConflict(barber.id, startAt, endAt);

    const whatsappMessage = this.buildWhatsappMessage({
      clientName: clientUser.clientProfile.firstName,
      barberName: barber.displayName,
      startAt,
      endAt,
      paymentMethod: input.paymentMethod,
      serviceNames: services.map((service) => service.name),
    });

    const created = await this.app.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          clientId: clientUser.clientProfile!.id,
          barberId: barber.id,
          startAt,
          endAt,
          status: AppointmentStatus.PENDING,
          paymentMethod: input.paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          subtotalAmount: subtotal,
          discountAmount,
          totalAmount,
          notes: input.notes ?? null,
          whatsappMessage,
          services: {
            create: services.map((service) => ({
              serviceId: service.id,
              serviceNameSnapshot: service.name,
              unitPriceSnapshot: service.price,
              durationMinutesSnapshot: service.durationMinutes,
              discountAmountSnapshot: 0,
            })),
          },
        },
        include: {
          client: true,
          barber: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      return appointment;
    });

    return {
      id: created.id,
      client: {
        id: created.client.id,
        firstName: created.client.firstName,
        lastName: created.client.lastName,
        phone: created.client.phone,
      },
      barber: {
        id: created.barber.id,
        displayName: created.barber.displayName,
        photoUrl: created.barber.photoUrl,
      },
      startAt: created.startAt,
      endAt: created.endAt,
      status: created.status,
      paymentMethod: created.paymentMethod,
      paymentStatus: created.paymentStatus,
      subtotalAmount: Number(created.subtotalAmount),
      discountAmount: Number(created.discountAmount),
      totalAmount: Number(created.totalAmount),
      notes: created.notes,
      whatsappMessage: created.whatsappMessage,
      services: created.services.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceNameSnapshot,
        unitPrice: Number(item.unitPriceSnapshot),
        durationMinutes: item.durationMinutesSnapshot,
        discountAmount: Number(item.discountAmountSnapshot),
      })),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  private async ensureWithinAvailability(
    barberId: string,
    availabilities: Array<{
      weekday: string;
      startTime: string;
      endTime: string;
      isActive: boolean;
    }>,
    startAt: Date,
    endAt: Date,
  ) {
    const weekday = WEEKDAYS[startAt.getDay()];
    const activeSlots = availabilities.filter(
      (item) => item.weekday === weekday && item.isActive,
    );

    if (activeSlots.length === 0) {
      throw new Error("O barbeiro não atende nesse dia da semana.");
    }

    const startMinutes = this.toMinutes(startAt);
    const endMinutes = this.toMinutes(endAt);

    const fitsInAnySlot = activeSlots.some((slot) => {
      const slotStart = this.parseTimeToMinutes(slot.startTime);
      const slotEnd = this.parseTimeToMinutes(slot.endTime);

      return startMinutes >= slotStart && endMinutes <= slotEnd;
    });

    if (!fitsInAnySlot) {
      throw new Error(
        "O horário escolhido está fora da disponibilidade do barbeiro.",
      );
    }

    const hasCrossDay = startAt.toDateString() !== endAt.toDateString();
    if (hasCrossDay) {
      throw new Error("O agendamento não pode atravessar para o dia seguinte.");
    }

    const existsOverlappingTimeOffWindow =
      await this.app.prisma.barberTimeOff.findFirst({
        where: {
          barberId,
          startAt: { lte: startAt },
          endAt: { gte: endAt },
        },
        select: { id: true },
      });

    if (existsOverlappingTimeOffWindow) {
      throw new Error("O horário escolhido cai em um bloqueio do barbeiro.");
    }
  }

  private async ensureNotInTimeOff(
    barberId: string,
    startAt: Date,
    endAt: Date,
  ) {
    const overlappingTimeOff = await this.app.prisma.barberTimeOff.findFirst({
      where: {
        barberId,
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
      },
      select: { id: true },
    });

    if (overlappingTimeOff) {
      throw new Error(
        "O horário escolhido cai em uma folga/bloqueio do barbeiro.",
      );
    }
  }

  private async ensureNoConflict(barberId: string, startAt: Date, endAt: Date) {
    const conflictingAppointment = await this.app.prisma.appointment.findFirst({
      where: {
        barberId,
        status: {
          in: ACTIVE_APPOINTMENT_STATUSES,
        },
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
      },
      select: {
        id: true,
      },
    });

    if (conflictingAppointment) {
      throw new Error(
        "Já existe um agendamento conflitante para esse horário.",
      );
    }
  }

  private parseTimeToMinutes(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private toMinutes(date: Date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString("pt-BR");
  }

  private formatTime(date: Date) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private formatPaymentMethod(method: PaymentMethod | string) {
    switch (method) {
      case "PIX":
        return "PIX";
      case "CREDIT":
        return "crédito";
      case "DEBIT":
        return "débito";
      case "PAY_LATER":
        return "pagar na hora";
      default:
        return method;
    }
  }

  private buildWhatsappMessage(params: {
    clientName: string;
    barberName: string;
    startAt: Date;
    endAt: Date;
    paymentMethod: PaymentMethod | string;
    serviceNames: string[];
  }) {
    return `Olá, ${params.clientName}. Seu agendamento na BarbUP foi confirmado para ${this.formatDate(
      params.startAt,
    )} às ${this.formatTime(params.startAt)} com o barbeiro ${
      params.barberName
    }. Término previsto às ${this.formatTime(params.endAt)}. Serviços: ${params.serviceNames.join(
      ", ",
    )}. Forma de pagamento: ${this.formatPaymentMethod(params.paymentMethod)}.`;
  }
}
