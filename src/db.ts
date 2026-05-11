import { MongoClient, type Collection, type Db } from "mongodb";
import { config } from "./config.js";

export type BotDocument = {
  botId: string;
  name?: string;
  clientId: string;
  clientSecretEnc: string;
  botTokenEnc: string;
  apiKeyHash: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VerificationDocument = {
  botId: string;
  guildId: string;
  userId: string;
  discordUser: {
    id: string;
    username: string;
    discriminator?: string;
    globalName?: string | null;
    avatar?: string | null;
    email?: string | null;
    verified?: boolean;
  };
  ip: {
    address: string;
    forwardedFor?: string;
    info?: Record<string, unknown>;
  };
  oauth: {
    accessTokenEnc: string;
    refreshTokenEnc?: string;
    scopes: string[];
    expiresAt?: Date;
  };
  guildJoin?: {
    ok: boolean;
    status: number;
    message?: string;
    at: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt: Date;
};

let client: MongoClient | undefined;
let database: Db | undefined;

export async function connectDb() {
  if (database) return database;

  client = new MongoClient(config.MONGO_URI);
  await client.connect();
  database = client.db(config.MONGO_DB);

  await Promise.all([
    bots().createIndex({ botId: 1 }, { unique: true }),
    bots().createIndex({ apiKeyHash: 1 }),
    verifications().createIndex({ botId: 1, guildId: 1, userId: 1 }, { unique: true }),
    verifications().createIndex({ botId: 1, guildId: 1 }),
    verifications().createIndex({ userId: 1 })
  ]);

  return database;
}

export function bots(): Collection<BotDocument> {
  if (!database) throw new Error("Database is not connected");
  return database.collection<BotDocument>("bots");
}

export function verifications(): Collection<VerificationDocument> {
  if (!database) throw new Error("Database is not connected");
  return database.collection<VerificationDocument>("verifications");
}

export async function closeDb() {
  await client?.close();
  client = undefined;
  database = undefined;
}
