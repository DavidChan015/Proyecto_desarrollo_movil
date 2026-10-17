import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../config/auth.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: number;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.header("Authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Se requiere un token Bearer válido." });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Token inválido o vencido." });
      return;
    }

    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({ error: "Token inválido o vencido." });
      return;
    }

    req.authenticatedUserId = userId;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Token inválido o vencido." });
      return;
    }
    next(error);
  }
};
