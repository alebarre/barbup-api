import type { FastifyInstance } from "fastify";
import type { Product } from "@prisma/client";

import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schemas";

export class ProductService {
  constructor(private readonly app: FastifyInstance) {}

  async list() {
    const products = await this.app.prisma.product.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return products.map((product) => this.toResponse(product));
  }

  async create(input: CreateProductInput) {
    const existing = await this.app.prisma.product.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe um produto com esse nome.");
    }

    const created = await this.app.prisma.product.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        imageUrl: input.imageUrl ?? null,
        isActive: input.isActive ?? true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateProductInput) {
    const existing = await this.app.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Produto não encontrado.");
    }

    if (input.name && input.name !== existing.name) {
      const nameInUse = await this.app.prisma.product.findFirst({
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
        throw new Error("Já existe um produto com esse nome.");
      }
    }

    const updated = await this.app.prisma.product.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        price: input.price ?? undefined,
        imageUrl: input.imageUrl ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string) {
    const existing = await this.app.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new Error("Produto não encontrado.");
    }

    await this.app.prisma.product.delete({
      where: { id },
    });

    return {
      message: "Produto removido com sucesso.",
      id: existing.id,
      name: existing.name,
    };
  }

  private toResponse(product: Product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
