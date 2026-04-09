import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../src/shared/utils/password";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada.");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedServices() {
  const services = [
    {
      name: "Corte",
      description: "Corte masculino tradicional.",
      price: "45.00",
      durationMinutes: 40,
      isActive: true,
    },
    {
      name: "Barba",
      description: "Modelagem e acabamento de barba.",
      price: "30.00",
      durationMinutes: 30,
      isActive: true,
    },
    {
      name: "Corte + Barba",
      description: "Combo de corte e barba.",
      price: "70.00",
      durationMinutes: 70,
      isActive: true,
    },
  ];

  for (const service of services) {
    const exists = await prisma.service.findFirst({
      where: {
        name: {
          equals: service.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.service.create({
        data: service,
      });
    }
  }
}

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    console.log(
      "Seed do SUPER_ADMIN ignorado: defina SEED_SUPER_ADMIN_EMAIL e SEED_SUPER_ADMIN_PASSWORD no .env.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true },
  });

  if (existing) {
    console.log(`SUPER_ADMIN já existe: ${existing.email}`);
    return;
  }

  await prisma.user.create({
    data: {
      role: UserRole.SUPER_ADMIN,
      email,
      passwordHash: hashPassword(password),
      isActive: true,
    },
  });

  console.log(`SUPER_ADMIN criado com sucesso: ${email}`);
}

async function main() {
  await seedServices();
  await seedSuperAdmin();

  console.log("Seed inicial do BarbUP executado com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
