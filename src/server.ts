import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { MongoServerError } from "mongodb";
import { config, corsOrigins } from "./config.js";
import { connectDb } from "./db.js";
import botRoutes from "./routes/bots.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.set("trust proxy", true);
app.use(helmet());
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/api/bots", botRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", details: err.flatten() });
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    return res.status(409).json({ error: "duplicate_key" });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.includes("Discord") ? 502 : 500;
  return res.status(status).json({ error: "internal_error", message });
});

await connectDb();

app.listen(config.PORT, () => {
  console.log(`API listening on ${config.PORT}`);
});
