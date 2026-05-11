import { Router } from "express";
import { z } from "zod";
import { bots, verifications } from "../db.js";
import { encryptSecret } from "../crypto.js";
import { asyncRoute } from "../middleware.js";
import { createDiscordState, verifyDiscordState } from "../state.js";
import { addUserToGuild, discordAuthorizeUrl, exchangeDiscordCode, fetchDiscordUser } from "../discord.js";
import { getRequestIp, lookupIpInfo } from "../ipinfo.js";

const router = Router();

const startSchema = z.object({
  botId: z.string().regex(/^\d{15,25}$/),
  guildId: z.string().regex(/^\d{15,25}$/),
  redirectUrl: z.string().url().optional()
});

router.get("/discord/start", asyncRoute(async (req, res) => {
  const input = startSchema.parse(req.query);
  const bot = await bots().findOne({ botId: input.botId, active: true });
  if (!bot) return res.status(404).json({ error: "bot_not_registered" });

  const state = createDiscordState(input);
  return res.redirect(discordAuthorizeUrl(bot, state));
}));

router.get("/discord/callback", asyncRoute(async (req, res) => {
  const code = z.string().min(1).parse(req.query.code);
  const state = z.string().min(1).parse(req.query.state);
  const payload = verifyDiscordState(state);

  const bot = await bots().findOne({ botId: payload.botId, active: true });
  if (!bot) return res.status(404).json({ error: "bot_not_registered" });

  const token = await exchangeDiscordCode(bot, code);
  const user = await fetchDiscordUser(token.access_token);
  const requestIp = getRequestIp(req);
  const ipInfo = await lookupIpInfo(requestIp.address);
  const guildJoin = await addUserToGuild(bot, payload.guildId, user.id, token.access_token);
  const now = new Date();

  await verifications().updateOne(
    { botId: payload.botId, guildId: payload.guildId, userId: user.id },
    {
      $set: {
        discordUser: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          globalName: user.global_name,
          avatar: user.avatar,
          email: user.email,
          verified: user.verified
        },
        ip: {
          address: requestIp.address,
          forwardedFor: requestIp.forwardedFor,
          info: ipInfo
        },
        oauth: {
          accessTokenEnc: encryptSecret(token.access_token),
          refreshTokenEnc: token.refresh_token ? encryptSecret(token.refresh_token) : undefined,
          scopes: token.scope.split(" ").filter(Boolean),
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined
        },
        guildJoin: {
          ...guildJoin,
          at: now
        },
        updatedAt: now,
        lastVerifiedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  if (payload.redirectUrl) {
    const url = new URL(payload.redirectUrl);
    url.searchParams.set("verified", "1");
    url.searchParams.set("botId", payload.botId);
    url.searchParams.set("guildId", payload.guildId);
    url.searchParams.set("userId", user.id);
    return res.redirect(url.toString());
  }

  return res.json({
    ok: true,
    botId: payload.botId,
    guildId: payload.guildId,
    userId: user.id,
    guildJoin
  });
}));

export default router;
