import crypto from "node:crypto";
import { config } from "./config.js";

type DiscordStatePayload = {
  botId: string;
  guildId: string;
  redirectUrl?: string;
  nonce: string;
  iat: number;
};

const maxAgeMs = 10 * 60 * 1000;

function sign(payload: string) {
  return crypto.createHmac("sha256", config.STATE_SECRET).update(payload).digest("base64url");
}

export function createDiscordState(input: Omit<DiscordStatePayload, "nonce" | "iat">) {
  const payload: DiscordStatePayload = {
    ...input,
    nonce: crypto.randomBytes(16).toString("base64url"),
    iat: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDiscordState(state: string): DiscordStatePayload {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    throw new Error("Invalid OAuth state");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DiscordStatePayload;
  if (Date.now() - payload.iat > maxAgeMs) {
    throw new Error("Expired OAuth state");
  }

  return payload;
}
