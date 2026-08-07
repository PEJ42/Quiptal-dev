import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function seed() {
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

  const audio = await prisma.productCategory.findUniqueOrThrow({ where: { name: "Audio" } });
  const accessories = await prisma.productCategory.findUniqueOrThrow({
    where: { name: "Accessories" },
  });
  const sampleDefinitions = [
    { name: "QSC K12.2 Speaker", categoryId: audio.id, defaultRentalCents: 7_500 },
    { name: "XLR Cable", categoryId: accessories.id, defaultRentalCents: 500 },
    { name: "Speaker Stand", categoryId: accessories.id, defaultRentalCents: 750 },
    { name: "Wireless Microphone", categoryId: audio.id, defaultRentalCents: 3_500 },
    { name: "Basic Mixer", categoryId: audio.id, defaultRentalCents: 4_000 },
  ];
  const sampleProducts = await Promise.all(
    sampleDefinitions.map(
      async (definition) =>
        (await prisma.product.findFirst({ where: { name: definition.name } })) ??
        prisma.product.create({ data: { ...definition, isTaxable: true } }),
    ),
  );
  const existingBundle = await prisma.bundle.findFirst({ where: { name: "Basic Party Bundle" } });
  if (!existingBundle)
    await prisma.bundle.create({
      data: {
        name: "Basic Party Bundle",
        description: "Fictional development bundle.",
        fixedRentalCents: 12_000,
        isTaxable: true,
        components: {
          create: [
            { productId: sampleProducts[0].id, quantity: 2, displayOrder: 0 },
            { productId: sampleProducts[4].id, quantity: 1, displayOrder: 1 },
          ],
        },
      },
    });
  const sampleCustomer = await prisma.customer.findFirst({
    where: { normalizedEmail: "alex@example.test" },
  });
  if (!sampleCustomer)
    await prisma.customer.create({
      data: {
        firstName: "Alex",
        lastName: "Example",
        email: "alex@example.test",
        normalizedEmail: "alex@example.test",
        phone: "555-0100",
      },
    });
  const template = await prisma.contractTemplate.findFirst({ where: { isActive: true } });
  if (!template)
    await prisma.contractTemplate.create({
      data: {
        title: "Equipment Rental Agreement",
        legalTerms:
          "The renter accepts responsibility for the listed equipment from pickup through return. Equipment must be returned in substantially the same condition, reasonable wear excepted. The renter is responsible for loss or damage up to the replacement cost where applicable.",
        footerText: "Thank you for choosing our rental service.",
      },
    });
}

seed().finally(() => prisma.$disconnect());
