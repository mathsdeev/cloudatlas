import type { Request } from "express";
import { config } from "./config.js";

export function getRequestIp(req: Request) {
  const forwardedFor = req.header("x-forwarded-for") ?? undefined;
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  const address = firstForwarded || req.ip || req.socket.remoteAddress || "unknown";

  return { address: address.replace(/^::ffff:/, ""), forwardedFor };
}

export async function lookupIpInfo(ip: string) {
  if (!config.IPINFO_TOKEN || ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
    return undefined;
  }

  const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${config.IPINFO_TOKEN}`);
  if (!response.ok) {
    return { lookupError: `ipinfo status ${response.status}` };
  }

  return response.json() as Promise<Record<string, unknown>>;
}
