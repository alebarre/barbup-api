import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";

import { ProductController } from "../controllers/product.controller";
import { ProductService } from "../services/product.service";
import { requireRole } from "../../../shared/guards/roles.guard";

export async function productRoutes(app: FastifyInstance) {
  const productService = new ProductService(app);
  const productController = new ProductController(productService);

  app.get("/", productController.list);

  app.post(
    "/",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    productController.create,
  );

  app.put(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    productController.update,
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(UserRole.SUPER_ADMIN)],
    },
    productController.remove,
  );
}
