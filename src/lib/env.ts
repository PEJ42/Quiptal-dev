import "server-only";

const configuredDatabaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV === "production" && !configuredDatabaseUrl) {
  throw new Error("DATABASE_URL must be configured in production.");
}

export const databaseUrl = configuredDatabaseUrl ?? "file:./prisma/dev.db";
