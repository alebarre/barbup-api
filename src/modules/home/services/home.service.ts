import type { FastifyInstance } from "fastify";

export class HomeService {
  constructor(private readonly app: FastifyInstance) {}

  async getFeed() {
    const now = new Date();

    const [services, barbers, promotions, products] = await Promise.all([
      this.app.prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.app.prisma.barberProfile.findMany({
        where: {
          isActive: true,
          user: {
            isActive: true,
          },
        },
        include: {
          user: true,
        },
        orderBy: [{ displayName: "asc" }],
      }),
      this.app.prisma.promotion.findMany({
        where: {
          isActive: true,
          startAt: { lte: now },
          endAt: { gte: now },
        },
        orderBy: [{ startAt: "asc" }],
        take: 10,
      }),
      this.app.prisma.product.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
      }),
    ]);

    return {
      hero: {
        brandName: "BarbUP",
        title: "Seu estilo começa aqui.",
        subtitle:
          "Agende seu horário com praticidade, escolha seu barbeiro e veja os melhores serviços da barbearia.",
        ctaLabel: "Agendar",
        highlight: "Barbearia premium, moderna e mobile first.",
      },
      sections: {
        servicesTitle: "Serviços",
        barbersTitle: "Barbeiros",
        promotionsTitle: "Promoções ativas",
        productsTitle: "Produtos em destaque",
      },
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: Number(service.price),
        durationMinutes: service.durationMinutes,
        isActive: service.isActive,
      })),
      barbers: barbers.map((barber) => ({
        id: barber.id,
        displayName: barber.displayName,
        bio: barber.bio,
        photoUrl: barber.photoUrl,
        isActive: barber.isActive,
      })),
      promotions: promotions.map((promotion) => ({
        id: promotion.id,
        title: promotion.title,
        description: promotion.description,
        type: promotion.type,
        value: Number(promotion.value),
        startAt: promotion.startAt,
        endAt: promotion.endAt,
        isActive: promotion.isActive,
      })),
      featuredProducts: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        isActive: product.isActive,
      })),
      actions: {
        primary: {
          label: "Agendar",
          route: "/appointments",
        },
        secondary: {
          label: "Ver meus agendamentos",
          route: "/appointments/me",
        },
      },
      metadata: {
        generatedAt: new Date(),
      },
    };
  }
}
