import type { FastifyInstance } from "fastify";
import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
  type Appointment,
  type PaymentMethod,
} from "@prisma/client";

import type {
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "../../appointments/schemas/appoitments.schemas";

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

    await this.ensureWithinAvailability(barber.availabilities, startAt, endAt);
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
      return tx.appointment.create({
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
        include: this.getAppointmentInclude(),
      });
    });

    return this.toResponse(created);
  }

  async listForMe(userId: string) {
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

    let appointments: any[] = [];

    if (user.role === UserRole.CLIENT) {
      if (!user.clientProfile) {
        throw new Error("Cliente não encontrado.");
      }

      appointments = await this.app.prisma.appointment.findMany({
        where: {
          clientId: user.clientProfile.id,
        },
        include: this.getAppointmentInclude(),
        orderBy: [{ startAt: "desc" }],
      });
    } else if (user.role === UserRole.BARBER) {
      if (!user.barberProfile) {
        throw new Error("Barbeiro não encontrado.");
      }

      appointments = await this.app.prisma.appointment.findMany({
        where: {
          barberId: user.barberProfile.id,
        },
        include: this.getAppointmentInclude(),
        orderBy: [{ startAt: "desc" }],
      });
    } else {
      appointments = await this.app.prisma.appointment.findMany({
        include: this.getAppointmentInclude(),
        orderBy: [{ startAt: "desc" }],
      });
    }

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async getById(userId: string, appointmentId: string) {
    const user = await this.getUserWithProfiles(userId);

    const appointment = await this.app.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: this.getAppointmentInclude(),
    });

    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    this.ensureCanAccessAppointment(user, appointment);

    return this.toResponse(appointment);
  }

  async cancel(userId: string, appointmentId: string) {
    const user = await this.getUserWithProfiles(userId);

    const appointment = await this.app.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: this.getAppointmentInclude(),
    });

    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    this.ensureCanCancelAppointment(user, appointment);
    this.ensureCanTransitionToCancelled(appointment);

    const updated = await this.app.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        paymentStatus:
          appointment.paymentStatus === PaymentStatus.PAID
            ? appointment.paymentStatus
            : PaymentStatus.CANCELLED,
      },
      include: this.getAppointmentInclude(),
    });

    return this.toResponseCancel(updated);
  }

  async accept(userId: string, appointmentId: string) {
    const user = await this.getUserWithProfiles(userId);

    const appointment = await this.app.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: this.getAppointmentInclude(),
    });

    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    this.ensureCanAcceptAppointment(user, appointment);

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new Error("Apenas agendamentos pendentes podem ser aceitos.");
    }

    const updated = await this.app.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.ACCEPTED,
      },
      include: this.getAppointmentInclude(),
    });

    return this.toResponse(updated);
  }

  async updateStatus(
    userId: string,
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
  ) {
    const user = await this.getUserWithProfiles(userId);

    const appointment = await this.app.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: this.getAppointmentInclude(),
    });

    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    this.ensureCanUpdateStatus(user, appointment);

    const nextStatus = input.status as AppointmentStatus;
    this.ensureValidManualStatusTransition(appointment.status, nextStatus);

    const updated = await this.app.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: nextStatus,
      },
      include: this.getAppointmentInclude(),
    });

    return this.toResponse(updated);
  }

  private async getUserWithProfiles(userId: string) {
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

    return user;
  }

  private getAppointmentInclude() {
    return {
      client: true,
      barber: true,
      services: {
        include: {
          service: true,
        },
      },
    } as const;
  }

  private ensureCanAccessAppointment(user: any, appointment: any) {
    if (user.role === UserRole.SUPER_ADMIN) return;

    if (
      user.role === UserRole.CLIENT &&
      user.clientProfile &&
      appointment.clientId === user.clientProfile.id
    ) {
      return;
    }

    if (
      user.role === UserRole.BARBER &&
      user.barberProfile &&
      appointment.barberId === user.barberProfile.id
    ) {
      return;
    }

    throw new Error("Acesso negado a este agendamento.");
  }

  private ensureCanCancelAppointment(user: any, appointment: any) {
    if (user.role === UserRole.SUPER_ADMIN) return;

    if (
      user.role === UserRole.CLIENT &&
      user.clientProfile &&
      appointment.clientId === user.clientProfile.id
    ) {
      return;
    }

    if (
      user.role === UserRole.BARBER &&
      user.barberProfile &&
      appointment.barberId === user.barberProfile.id
    ) {
      return;
    }

    throw new Error("Você não pode cancelar este agendamento.");
  }

  private ensureCanAcceptAppointment(user: any, appointment: any) {
    if (user.role === UserRole.SUPER_ADMIN) return;

    if (
      user.role === UserRole.BARBER &&
      user.barberProfile &&
      appointment.barberId === user.barberProfile.id
    ) {
      return;
    }

    throw new Error("Você não pode aceitar este agendamento.");
  }

  private ensureCanUpdateStatus(user: any, appointment: any) {
    if (user.role === UserRole.SUPER_ADMIN) return;

    if (
      user.role === UserRole.BARBER &&
      user.barberProfile &&
      appointment.barberId === user.barberProfile.id
    ) {
      return;
    }

    throw new Error("Você não pode alterar o status deste agendamento.");
  }

  private ensureCanTransitionToCancelled(appointment: Appointment) {
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new Error("Este agendamento já está cancelado.");
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new Error("Não é possível cancelar um agendamento concluído.");
    }

    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new Error(
        "Não é possível cancelar um agendamento marcado como no-show.",
      );
    }
  }

  private ensureValidManualStatusTransition(
    currentStatus: AppointmentStatus,
    nextStatus: AppointmentStatus,
  ) {
    if (currentStatus === nextStatus) {
      throw new Error("O agendamento já está com esse status.");
    }

    if (
      currentStatus === AppointmentStatus.CANCELLED ||
      currentStatus === AppointmentStatus.COMPLETED ||
      currentStatus === AppointmentStatus.NO_SHOW
    ) {
      throw new Error(
        `Não é possível alterar o status final de um agendamento com status: ${currentStatus}.`,
      );
    }
  }

  private async ensureWithinAvailability(
    availabilities: Array<{
      weekday: string;
      startTime: string;
      endTime: string;
      isActive: boolean;
    }>,
    startAt: Date,
    endAt: Date,
  ) {
    const hasCrossDay = startAt.toDateString() !== endAt.toDateString();
    if (hasCrossDay) {
      throw new Error("O agendamento não pode atravessar para o dia seguinte.");
    }

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

  private toResponse(appointment: any) {
    return {
      id: appointment.id,
      client: {
        id: appointment.client.id,
        firstName: appointment.client.firstName,
        lastName: appointment.client.lastName,
        phone: appointment.client.phone,
        photoUrl: appointment.client.photoUrl,
      },
      barber: {
        id: appointment.barber.id,
        displayName: appointment.barber.displayName,
        photoUrl: appointment.barber.photoUrl,
        bio: appointment.barber.bio,
      },
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      paymentMethod: appointment.paymentMethod,
      paymentStatus: appointment.paymentStatus,
      subtotalAmount: Number(appointment.subtotalAmount),
      discountAmount: Number(appointment.discountAmount),
      totalAmount: Number(appointment.totalAmount),
      notes: appointment.notes,
      whatsappMessage: appointment.whatsappMessage,
      whatsappMessageSentAt: appointment.whatsappMessageSentAt,
      services: appointment.services.map((item: any) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceNameSnapshot,
        unitPrice: Number(item.unitPriceSnapshot),
        durationMinutes: item.durationMinutesSnapshot,
        discountAmount: Number(item.discountAmountSnapshot),
      })),
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  private toResponseCancel(appointment: any) {
    return {
      id: appointment.id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      client: {
        id: appointment.client.id,
        firstName: appointment.client.firstName,
      },
      barber: {
        id: appointment.barber.id,
        displayName: appointment.barber.displayName,
      },

      services: appointment.services.map((item: any) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceNameSnapshot,
        unitPrice: Number(item.unitPriceSnapshot),
        durationMinutes: item.durationMinutesSnapshot,
        discountAmount: Number(item.discountAmountSnapshot),
      })),
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
