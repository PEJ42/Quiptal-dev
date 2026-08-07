import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
