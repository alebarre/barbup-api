import type { FastifyInstance } from "fastify";
import {
  UserRole,
  type MembershipPlan,
  type ClientMembership,
} from "@prisma/client";

import type {
  CreateMembershipPlanInput,
  SubscribeMembershipInput,
  UpdateMembershipPlanInput,
} from "../schemas/membership.schemas";

type MembershipPlanWithRelations = MembershipPlan & {
  clientMemberships?: ClientMembership[];
};

type ClientMembershipWithRelations = ClientMembership & {
  membershipPlan: MembershipPlan;
};

export class MembershipService {
  constructor(private readonly app: FastifyInstance) {}

  async listPlans() {
    const plans = await this.app.prisma.membershipPlan.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return plans.map((plan) => this.toPlanResponse(plan));
  }

  async createPlan(input: CreateMembershipPlanInput) {
    const existing = await this.app.prisma.membershipPlan.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe um plano com esse nome.");
    }

    const created = await this.app.prisma.membershipPlan.create({
      data: {
        name: input.name,
        monthlyPrice: input.monthlyPrice,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
    });

    return this.toPlanResponse(created);
  }

  async updatePlan(id: string, input: UpdateMembershipPlanInput) {
    const existing = await this.app.prisma.membershipPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Plano não encontrado.");
    }

    if (input.name && input.name !== existing.name) {
      const nameInUse = await this.app.prisma.membershipPlan.findFirst({
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
        throw new Error("Já existe um plano com esse nome.");
      }
    }

    const updated = await this.app.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        monthlyPrice: input.monthlyPrice ?? undefined,
        description: input.description ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toPlanResponse(updated);
  }

  async removePlan(id: string) {
    const existing = await this.app.prisma.membershipPlan.findUnique({
      where: { id },
      include: {
        clientMemberships: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new Error("Plano não encontrado.");
    }

    if (existing.clientMemberships.length > 0) {
      throw new Error(
        "Não é possível remover o plano porque há clientes com assinatura ativa.",
      );
    }

    await this.app.prisma.membershipPlan.delete({
      where: { id },
    });

    return {
      message: "Plano removido com sucesso.",
      id: existing.id,
      name: existing.name,
    };
  }

  async getMyMemberships(userId: string) {
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
      throw new Error("Apenas clientes podem consultar suas assinaturas.");
    }

    const memberships = await this.app.prisma.clientMembership.findMany({
      where: {
        clientId: user.clientProfile.id,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    });

    const activeMembership =
      memberships.find((membership) => membership.isActive) ?? null;

    return {
      activeMembership: activeMembership
        ? this.toClientMembershipResponse(activeMembership)
        : null,
      history: memberships.map((membership) =>
        this.toClientMembershipResponse(membership),
      ),
    };
  }

  async subscribe(userId: string, input: SubscribeMembershipInput) {
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
      throw new Error("Apenas clientes podem contratar um plano.");
    }

    const plan = await this.app.prisma.membershipPlan.findUnique({
      where: { id: input.membershipPlanId },
    });

    if (!plan) {
      throw new Error("Plano não encontrado.");
    }

    if (!plan.isActive) {
      throw new Error("O plano informado está inativo.");
    }

    const activeMembership = await this.app.prisma.clientMembership.findFirst({
      where: {
        clientId: user.clientProfile.id,
        isActive: true,
      },
      include: {
        membershipPlan: true,
      },
    });

    if (activeMembership) {
      throw new Error("O cliente já possui uma assinatura ativa.");
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Data inicial inválida.");
    }

    const created = await this.app.prisma.clientMembership.create({
      data: {
        clientId: user.clientProfile.id,
        membershipPlanId: plan.id,
        startDate,
        isActive: true,
      },
      include: {
        membershipPlan: true,
      },
    });

    return this.toClientMembershipResponse(created);
  }

  async cancelMyMembership(userId: string) {
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
      throw new Error("Apenas clientes podem cancelar a própria assinatura.");
    }

    const activeMembership = await this.app.prisma.clientMembership.findFirst({
      where: {
        clientId: user.clientProfile.id,
        isActive: true,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: [{ startDate: "desc" }],
    });

    if (!activeMembership) {
      throw new Error("O cliente não possui assinatura ativa.");
    }

    const updated = await this.app.prisma.clientMembership.update({
      where: { id: activeMembership.id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
      include: {
        membershipPlan: true,
      },
    });

    return this.toClientMembershipResponse(updated);
  }

  private toPlanResponse(plan: MembershipPlanWithRelations) {
    return {
      id: plan.id,
      name: plan.name,
      monthlyPrice: Number(plan.monthlyPrice),
      description: plan.description,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private toClientMembershipResponse(
    membership: ClientMembershipWithRelations,
  ) {
    return {
      id: membership.id,
      clientId: membership.clientId,
      membershipPlanId: membership.membershipPlanId,
      startDate: membership.startDate,
      endDate: membership.endDate,
      isActive: membership.isActive,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      membershipPlan: {
        id: membership.membershipPlan.id,
        name: membership.membershipPlan.name,
        monthlyPrice: Number(membership.membershipPlan.monthlyPrice),
        description: membership.membershipPlan.description,
        isActive: membership.membershipPlan.isActive,
      },
    };
  }
}
