import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { ClientService } from "../services/client.service";
import { updateMeSchema } from "../schemas/client.schemas";

export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.clientService.getMe(request.user.sub);
      return reply.status(200).send(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao buscar perfil do cliente.";

      const statusCode =
        message === "Acesso permitido apenas para clientes." ? 403 : 404;

      return reply.status(statusCode).send({ message });
    }
  };

  updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = updateMeSchema.parse(request.body);
      const result = await this.clientService.updateMe(request.user.sub, input);

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: "Dados inválidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao atualizar perfil do cliente.";

      const statusCode =
        message === "Acesso permitido apenas para clientes." ? 403 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  uploadPhoto = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          message: "Arquivo não enviado.",
        });
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return reply.status(400).send({
          message: "Formato de arquivo inválido. Envie JPG, PNG ou WEBP.",
        });
      }

      const extension = this.getExtension(file.mimetype);
      const fileName = `${request.user.sub}-${crypto.randomUUID()}.${extension}`;
      const uploadDir = path.resolve(process.cwd(), "uploads", "clients");
      const fullPath = path.join(uploadDir, fileName);

      await fs.mkdir(uploadDir, { recursive: true });

      const buffer = await file.toBuffer();
      await fs.writeFile(fullPath, buffer);

      const photoUrl = `/uploads/clients/${fileName}`;
      const result = await this.clientService.updatePhoto(
        request.user.sub,
        photoUrl,
      );

      return reply.status(200).send(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao enviar foto do cliente.";

      const statusCode =
        message === "Acesso permitido apenas para clientes." ? 403 : 400;

      return reply.status(statusCode).send({ message });
    }
  };

  private getExtension(mimetype: string) {
    switch (mimetype) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      default:
        return "bin";
    }
  }
}
