import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@demo.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed already applied");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const company = await prisma.company.create({
    data: {
      name: "Демо Компания",
      users: {
        create: {
          email,
          passwordHash,
          name: "Администратор",
          role: "ADMIN",
          lastSeenAt: new Date(),
        },
      },
      sites: {
        create: {
          name: "Демо сайт",
          domain: "localhost",
          widgetTitle: "Поддержка",
          widgetGreeting: "Здравствуйте! Напишите нам.",
          metrikaCounterId: null,
          workHoursStart: 0,
          workHoursEnd: 24 * 60,
          workDays: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        },
      },
    },
    include: { sites: true, users: true },
  });

  const operatorHash = await bcrypt.hash("operator123", 10);
  await prisma.user.create({
    data: {
      email: "operator@demo.local",
      passwordHash: operatorHash,
      name: "Оператор",
      role: "OPERATOR",
      companyId: company.id,
    },
  });

  console.log("Demo admin: admin@demo.local / demo1234");
  console.log("Demo operator: operator@demo.local / operator123");
  console.log("Site public key:", company.sites[0].publicKey);
}

main()
  .finally(() => prisma.$disconnect());
