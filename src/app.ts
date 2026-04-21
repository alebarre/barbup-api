import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";

import { prismaPlugin } from "./shared/plugins/prisma";
import { jwtPlugin } from "./shared/plugins/jwt";
import { authRoutes } from "./modules/auth/routes/auth.routes";
import { clientRoutes } from "./modules/clients/routes/client.routes";
import { serviceRoutes } from "./modules/services/routes/service.routes";
import { barberRoutes } from "./modules/barbers/routes/barber.routes";
import { appointmentRoutes } from "./modules/appointments/routes/appointment.routes";
import { homeRoutes } from "./modules/home/routes/home.routes";
import { productRoutes } from "./modules/products/routes/product.routes";
import { promotionRoutes } from "./modules/promotions/routes/promotion.routes";
import { campaignRoutes } from "./modules/campaigns/routes/campaign.routes";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(multipart);

  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
  });

  await app.register(prismaPlugin);
  await app.register(jwtPlugin);

  app.get("/health", async () => {
    return { status: "UP" };
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(clientRoutes, { prefix: "/clients" });
  await app.register(serviceRoutes, { prefix: "/services" });
  await app.register(barberRoutes, { prefix: "/barbers" });
  await app.register(appointmentRoutes, { prefix: "/appointments" });
  await app.register(homeRoutes, { prefix: "/home" });
  await app.register(productRoutes, { prefix: "/products" });
  await app.register(promotionRoutes, { prefix: "/promotions" });
  await app.register(campaignRoutes, { prefix: "/campaigns" });

  return app;
}
