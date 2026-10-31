import express from "express";
import cors from "cors";
import authRoutes from "./src/interface/routes/authRoutes.js";
import censusRoutes from "./src/interface/routes/censusRoutes.js";
import livenessRoutes from "./src/interface/routes/livenessRoutes.js";
import { sequelize } from "./src/infrastructure/database/sequelize.js";

export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:4200",
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT"],
}));
app.use(express.json({ limit: "8mb" }));

app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api", authRoutes);
app.use("/api/censuses", censusRoutes);
app.use("/liveness", livenessRoutes);
