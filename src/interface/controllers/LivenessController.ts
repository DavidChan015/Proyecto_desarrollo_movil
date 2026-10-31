import type { Request, Response } from "express";
import {
  LivenessService,
  LivenessSessionAccessError,
} from "../../infrastructure/services/LivenessService.js";

const livenessService = new LivenessService();

export class LivenessController {
  async createSession(req: Request, res: Response): Promise<void> {
    const userId = req.authenticatedUserId;
    if (!userId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }

    try {
      const session = await livenessService.createSession(userId);
      res.status(201).json(session);
    } catch (error) {
      console.error(
        "Failed to create Face Liveness session:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(502).json({ error: "No se pudo crear la sesión de verificación." });
    }
  }

  async getResult(req: Request, res: Response): Promise<void> {
    const userId = req.authenticatedUserId;
    const sessionId = req.params.sessionId;

    if (!userId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }
    if (typeof sessionId !== "string" || !sessionId) {
      res.status(400).json({ error: "Se requiere sessionId." });
      return;
    }

    try {
      const result = await livenessService.getResult(userId, sessionId);
      if (!result) {
        res.status(404).json({ error: "La sesión no existe." });
        return;
      }

      res.status(
        result.status === "CREATED" || result.status === "IN_PROGRESS" ? 202 : 200,
      ).json(result);
    } catch (error) {
      if (error instanceof LivenessSessionAccessError) {
        res.status(403).json({ error: "No tienes acceso a esta sesión." });
        return;
      }

      console.error(
        "Failed to retrieve Face Liveness result:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(502).json({ error: "No se pudo consultar el resultado de la verificación." });
    }
  }
}
