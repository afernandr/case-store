import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var cachedPrisma: PrismaClient;
}

const connectionString = `${process.env.DATABASE_URL_2}`;
const adapter = new PrismaPg({ connectionString });

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient({ adapter });
  }

  prisma = global.cachedPrisma;
}

export const db = prisma;
