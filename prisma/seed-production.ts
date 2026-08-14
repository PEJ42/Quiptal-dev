import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function seedProductionReferenceData() {
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  await Promise.all(
    [
      "Audio",
      "Lighting",
      "Video",
      "Power",
      "Rigging",
      "Accessories",
      "Furniture",
      "Miscellaneous",
      "Owner",
    ].map((name, sortOrder) =>
      prisma.productCategory.upsert({
        where: { name },
        update: { sortOrder, isActive: true },
        create: { name, sortOrder },
      }),
    ),
  );

  await Promise.all(
    ["Reserved", "Picked Up", "Returned"].map((name, sortOrder) =>
      prisma.bookingStatus.upsert({
        where: { name },
        update: { sortOrder, isActive: true },
        create: { name, sortOrder },
      }),
    ),
  );

  await Promise.all(
    [
      "Wedding",
      "Corporate",
      "Birthday",
      "Church",
      "Festival",
      "Private Party",
      "Concert",
      "Other",
    ].map((name, sortOrder) =>
      prisma.bookingType.upsert({
        where: { name },
        update: { sortOrder, isActive: true },
        create: { name, sortOrder },
      }),
    ),
  );

  await Promise.all(
    ["Pickup", "Delivery", "Setup", "Teardown"].map((name, sortOrder) =>
      prisma.service.upsert({
        where: { name },
        update: { sortOrder, isActive: true },
        create: { name, sortOrder },
      }),
    ),
  );

  const template = await prisma.contractTemplate.findFirst({ where: { isActive: true } });
  if (!template) {
    await prisma.contractTemplate.create({
      data: {
        title: "Equipment Rental Agreement",
        legalTerms:
          "The renter accepts responsibility for the listed equipment from pickup through return. Equipment must be returned in substantially the same condition, reasonable wear excepted. The renter is responsible for loss or damage up to the replacement cost where applicable.",
        footerText: "Thank you for choosing our rental service.",
      },
    });
  }
}

seedProductionReferenceData().finally(() => prisma.$disconnect());
