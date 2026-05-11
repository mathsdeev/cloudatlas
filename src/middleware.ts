import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { bots, type BotDocument } from "./db.js";
import { hashApiKey, timingSafeEqualString } from "./crypto.js";

declare global {
  namespace Express {
    interface Request {
      bot?: BotDocument;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!config.ADMIN_API_KEY && config.NODE_ENV !== "production") return next();

  const apiKey = req.header("x-admin-api-key");
  if (!apiKey || !config.ADMIN_API_KEY || !timingSafeEqualString(apiKey, config.ADMIN_API_KEY)) {
    return res.status(401).json({ error: "invalid_admin_api_key" });
  }

  return next();
}

export async function requireBot(req: Request, res: Response, next: NextFunction) {
  const botId = req.params.botId || req.query.botId;
  const apiKey = req.header("x-bot-api-key");

  if (typeof botId !== "string" || !apiKey) {
    return res.status(401).json({ error: "missing_bot_credentials" });
  }

  const bot = await bots().findOne({ botId, active: true });
  if (!bot || bot.apiKeyHash !== hashApiKey(apiKey)) {
    return res.status(401).json({ error: "invalid_bot_credentials" });
  }

  req.bot = bot;
  return next();
}

export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
