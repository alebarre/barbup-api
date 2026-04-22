import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { MembershipService } from "../services/membership.service";
import {
  createMembershipPlanSchema,
  membershipPlanIdParamSchema,
  subscribeMembershipSchema,
  updateMembershipPlanSchema,
} from "../schemas/membership.schemas";

export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  listPlans = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.membershipService.listPlans();
    return reply.status(200).send(result);
  };

  createPlan = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createMembershipPlanSchema.parse(request.body);
      const result = await this.membershipService.createPlan(input);

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao criar plano.");
    }
  };

  updatePlan = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = membershipPlanIdParamSchema.parse(request.params);
      const input = updateMembershipPlanSchema.parse(request.body);
      const result = await this.membershipService.updatePlan(id, input);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao atualizar plano.");
    }
  };

  removePlan = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = membershipPlanIdParamSchema.parse(request.params);
      const result = await this.membershipService.removePlan(id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao remover plano.");
    }
  };

  getMyMemberships = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.membershipService.getMyMemberships(
        request.user.sub,
      );

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao consultar assinatura.");
    }
  };

  subscribe = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = subscribeMembershipSchema.parse(request.body);
      const result = await this.membershipService.subscribe(
        request.user.sub,
        input,
      );

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao contratar plano.");
    }
  };

  cancelMyMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.membershipService.cancelMyMembership(
        request.user.sub,
      );

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao cancelar assinatura.");
    }
  };

  private handleError(reply: FastifyReply, error: unknown, fallback: string) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Dados inválidos.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : fallback;

    const statusCode =
      message === "Plano não encontrado." ||
      message === "Cliente não encontrado."
        ? 404
        : message.includes("Apenas clientes") || message.includes("não possui")
          ? 403
          : 400;

    return reply.status(statusCode).send({ message });
  }
}
