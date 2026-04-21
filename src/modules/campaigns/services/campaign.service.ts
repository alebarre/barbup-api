import type { FastifyInstance } from "fastify";
import type { CampaignMessage } from "@prisma/client";

import type { CreateCampaignInput, UpdateCampaignInput } from "../schemas/campaing.schemas";

export class CampaignService {
  constructor(private readonly app: FastifyInstance) {}

  async list() {
    const campaigns = await this.app.prisma.campaignMessage.findMany({
      include: {
        createdByUser: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return campaigns.map((campaign) => this.toResponse(campaign));
  }

  async create(createdByUserId: string, input: CreateCampaignInput) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: createdByUserId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new Error("Usuário criador não encontrado.");
    }

    const created = await this.app.prisma.campaignMessage.create({
      data: {
        title: input.title,
        content: input.content,
        targetType: input.targetType,
        createdByUserId,
      },
      include: {
        createdByUser: true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateCampaignInput) {
    try {
      const updated = await this.app.prisma.campaignMessage.update({
        where: { id },
        data: {
          title: input.title,
          content: input.content,
          targetType: input.targetType,
        },
        include: {
          createdByUser: true,
        },
      });
      return this.toResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("No record was found")) {
          throw new Error("Campanha não encontrada.");
        }
      } else {
        throw new Error("Erro ao atualizar campanha.");
      }
    }
        
  }

  async delete (id: string) {
    try {
      await this.app.prisma.campaignMessage.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("No record was found")) {
          throw new Error("Campanha não encontrada.");
        }
      } else {
        throw new Error("Erro ao deletar campanha.");
      }
    }
  }

  private toResponse(
    campaign: CampaignMessage & {
      createdByUser?: {
        id: string;
        email: string;
        role: string;
      };
    },
  ) {
    return {
      id: campaign.id,
      title: campaign.title,
      content: campaign.content,
      targetType: campaign.targetType,
      createdAt: campaign.createdAt,
      createdByUser: campaign.createdByUser
        ? {
            id: campaign.createdByUser.id,
            email: campaign.createdByUser.email,
            role: campaign.createdByUser.role,
          }
        : null,
    };
  }
}
