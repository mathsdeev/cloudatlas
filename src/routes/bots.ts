import { Router } from "express";
import { z } from "zod";
import { bots, verifications } from "../db.js";
import { createApiKey, encryptSecret, hashApiKey } from "../crypto.js";
import { asyncRoute, requireAdmin, requireBot } from "../middleware.js";

const router = Router();

const registerSchema = z.object({
  botId: z.string().regex(/^\d{15,25}$/),
  name: z.string().trim().min(1).max(80).optional(),
  clientId: z.string().regex(/^\d{15,25}$/),
  clientSecret: z.string().min(20),
  botToken: z.string().min(20)
});

router.post("/register", requireAdmin, asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const apiKey = createApiKey();
  const now = new Date();

  await bots().updateOne(
    { botId: input.botId },
    {
      $set: {
        name: input.name,
        clientId: input.clientId,
        clientSecretEnc: encryptSecret(input.clientSecret),
        botTokenEnc: encryptSecret(input.botToken),
        apiKeyHash: hashApiKey(apiKey),
        active: true,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  res.status(201).json({
    botId: input.botId,
    apiKey,
    authStartUrl: `/auth/discord/start?botId=${input.botId}&guildId=SERVER_ID`
  });
}));

router.get("/:botId/guilds/:guildId/users", requireBot, asyncRoute(async (req, res) => {
  const { botId, guildId } = req.params;
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    verifications()
      .find({ botId, guildId })
      .project({ "oauth.accessTokenEnc": 0, "oauth.refreshTokenEnc": 0 })
      .sort({ lastVerifiedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    verifications().countDocuments({ botId, guildId })
  ]);

  res.json({ botId, guildId, page, limit, total, items });
}));

router.get("/:botId/users/:userId", requireBot, asyncRoute(async (req, res) => {
  const { botId, userId } = req.params;
  const items = await verifications()
    .find({ botId, userId })
    .project({ "oauth.accessTokenEnc": 0, "oauth.refreshTokenEnc": 0 })
    .sort({ lastVerifiedAt: -1 })
    .toArray();

  res.json({ botId, userId, items });
}));

export default router;
