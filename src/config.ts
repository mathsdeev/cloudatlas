import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  MONGO_DB: z.string().min(1).default("cloud_atlas"),
  ADMIN_API_KEY: z.string().min(8).optional(),
  STATE_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().min(32),
  IPINFO_TOKEN: z.string().optional(),
  CORS_ORIGINS: z.string().optional()
});

export const config = envSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGINS
  ? config.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

export const discordRedirectUri = `${config.PUBLIC_BASE_URL}/auth/discord/callback`;
