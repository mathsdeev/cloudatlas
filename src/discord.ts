import { decryptSecret } from "./crypto.js";
import { discordRedirectUri } from "./config.js";
import type { BotDocument } from "./db.js";

export type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
};

export function discordAuthorizeUrl(bot: BotDocument, state: string) {
  const params = new URLSearchParams({
    client_id: bot.clientId,
    redirect_uri: discordRedirectUri,
    response_type: "code",
    scope: "identify email guilds.join",
    state,
    prompt: "consent"
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(bot: BotDocument, code: string) {
  const body = new URLSearchParams({
    client_id: bot.clientId,
    client_secret: decryptSecret(bot.clientSecretEnc),
    grant_type: "authorization_code",
    code,
    redirect_uri: discordRedirectUri
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed with status ${response.status}`);
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(accessToken: string) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Discord user fetch failed with status ${response.status}`);
  }

  return response.json() as Promise<DiscordUser>;
}

export async function addUserToGuild(bot: BotDocument, guildId: string, userId: string, accessToken: string) {
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${decryptSecret(bot.botTokenEnc)}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ access_token: accessToken })
  });

  if (response.ok) {
    return { ok: true, status: response.status };
  }

  const message = await response.text().catch(() => undefined);
  return { ok: false, status: response.status, message };
}
