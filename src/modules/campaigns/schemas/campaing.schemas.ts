import { z } from "zod";

export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório.")
    .max(180, "Título deve ter no máximo 180 caracteres."),
  content: z
    .string()
    .trim()
    .min(1, "Conteúdo é obrigatório.")
    .max(5000, "Conteúdo deve ter no máximo 5000 caracteres."),
  targetType: z.enum([
    "ALL_CLIENTS",
    "ACTIVE_CLIENTS",
    "MEMBERSHIP_CLIENTS",
    "CUSTOM_GROUP",
  ]),
});

export const updateCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório.")
    .max(180, "Título deve ter no máximo 180 caracteres."),
  content: z
    .string()
    .trim()
    .min(1, "Conteúdo é obrigatório.")
    .max(5000, "Conteúdo deve ter no máximo 5000 caracteres."),
  targetType: z.enum([
    "ALL_CLIENTS",
    "ACTIVE_CLIENTS",
    "MEMBERSHIP_CLIENTS",
    "CUSTOM_GROUP",
  ]),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
