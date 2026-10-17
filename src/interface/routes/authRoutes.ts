import express, { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const authController = new AuthController();
const authRoutes = Router();

authRoutes.post("/register", (req, res) => authController.register(req, res));
authRoutes.post("/login", (req, res) => authController.login(req, res));
authRoutes.get("/profile/photo", requireAuth, (req, res) => authController.getProfilePhoto(req, res));
authRoutes.get("/profile", requireAuth, (req, res) => authController.getProfile(req, res));
authRoutes.put("/profile", requireAuth, (req, res) => authController.updateProfile(req, res));
authRoutes.put(
  "/profile/photo",
  requireAuth,
  express.raw({
    type: ["application/octet-stream", "image/jpeg", "image/png", "image/webp"],
    limit: "6mb",
  }),
  (req, res) => authController.uploadProfilePhoto(req, res)
);

export default authRoutes;
