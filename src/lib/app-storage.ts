import path from "path";

const configuredDataDirectory = process.env.APP_DATA_DIR?.trim();

/**
 * Private application data lives outside the deployed source directory in production.
 * Local development keeps the existing storage/ directory unless explicitly configured.
 */
export const appDataDirectory = path.resolve(
  configuredDataDirectory || path.join(process.cwd(), "storage"),
);

export const catalogUploadsDirectory = path.join(appDataDirectory, "uploads");
export const companyLogosDirectory = path.join(appDataDirectory, "company-logos");
export const contractsDirectory = path.join(appDataDirectory, "contracts");
export const checklistUploadsDirectory = path.join(appDataDirectory, "checklist-uploads");
