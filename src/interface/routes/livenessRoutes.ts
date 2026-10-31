import { Router } from "express";
import { LivenessController } from "../controllers/LivenessController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const livenessController = new LivenessController();
const livenessRoutes = Router();

livenessRoutes.post("/sessions", requireAuth, (req, res) =>
  livenessController.createSession(req, res),
);
livenessRoutes.get("/sessions/:sessionId", requireAuth, (req, res) =>
  livenessController.getResult(req, res),
);

export default livenessRoutes;
