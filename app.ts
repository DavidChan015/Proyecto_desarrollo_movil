import express from "express";
import cors from "cors";
import authRoutes from "./src/interface/routes/authRoutes.js";
import censusRoutes from "./src/interface/routes/censusRoutes.js";

export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:4200",
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT"],
}));
app.use(express.json({ limit: "8mb" }));

app.use("/api", authRoutes);
app.use("/api/censuses", censusRoutes);
