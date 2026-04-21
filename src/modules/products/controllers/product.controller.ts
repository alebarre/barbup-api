import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { ProductService } from "../services/product.service";
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
} from "../schemas/product.schemas";

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.productService.list();
    return reply.status(200).send(result);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createProductSchema.parse(request.body);
      const result = await this.productService.create(input);

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao criar produto.");
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = productIdParamSchema.parse(request.params);
      const input = updateProductSchema.parse(request.body);
      const result = await this.productService.update(id, input);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao atualizar produto.");
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = productIdParamSchema.parse(request.params);
      const result = await this.productService.remove(id);

      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(reply, error, "Erro ao remover produto.");
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
    const statusCode = message === "Produto não encontrado." ? 404 : 400;

    return reply.status(statusCode).send({ message });
  }
}
