import { Router } from "express";
import { CensusController } from "../controllers/CensusController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const censusController = new CensusController();
const censusRoutes = Router();

censusRoutes.post(
  "/",
  requireAuth,
  requireRole("censista"),
  (req, res) => censusController.create(req, res)
);
censusRoutes.get(
  "/",
  requireAuth,
  (req, res) => censusController.list(req, res)
);
censusRoutes.get(
  "/massive",
  requireAuth,
  requireRole("administrador"),
  (req, res) => censusController.listMassive(req, res)
);

export default censusRoutes;
