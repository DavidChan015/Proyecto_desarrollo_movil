import { Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import { AuthService, ProfileInput, RegistrationInput } from "../../infrastructure/services/AuthService.js";

const authService = new AuthService();
const profileFields = ["telefono", "bio", "fecha_cumpleanos", "genero"] as const;
const profileAliases: Record<(typeof profileFields)[number], readonly string[]> = {
  telefono: [],
  bio: ["biografia"],
  fecha_cumpleanos: ["cumpleanos", "fechaCumpleanos"],
  genero: [],
};

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseProfile = (value: unknown): ProfileInput | null => {
  if (!isRecord(value)) {
    return null;
  }

  const profile: ProfileInput = {};
  for (const field of profileFields) {
    const suppliedField = [field, ...profileAliases[field]].find((candidate) => candidate in value);
    if (!suppliedField) {
      continue;
    }

    const fieldValue = value[suppliedField];
    if (fieldValue === null) {
      profile[field] = null;
      continue;
    }
    if (typeof fieldValue !== "string") {
      return null;
    }

    const trimmed = fieldValue.trim();
    const maximumLength = field === "telefono" ? 30 : field === "bio" ? 255 : field === "genero" ? 50 : undefined;
    if (maximumLength !== undefined && trimmed.length > maximumLength) {
      return null;
    }

    if (field === "fecha_cumpleanos" && trimmed !== "") {
      const date = new Date(`${trimmed}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== trimmed) {
        return null;
      }
      profile[field] = trimmed;
      continue;
    }

    profile[field] = trimmed === "" ? null : trimmed;
  }

  return profile;
};

const getProfilePayload = (body: RecordValue): unknown =>
  "profile" in body ? body.profile : body;

const respondWithError = (res: Response, message: string, error: unknown): void => {
  console.error(message, error);
  res.status(500).json({ error: "Error interno del servidor." });
};

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const body: unknown = req.body;
    if (!isRecord(body)) {
      res.status(400).json({ error: "El cuerpo de la solicitud no es válido." });
      return;
    }

    const { nombre, apellido, usuario, email, password } = body;
    if (!isNonEmptyString(nombre) ||
        !isNonEmptyString(apellido) ||
        !isNonEmptyString(usuario) ||
        !isNonEmptyString(email) ||
        !isNonEmptyString(password)) {
      res.status(400).json({ error: "nombre, apellido, usuario, email y password son obligatorios." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = usuario.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 254 ||
        normalizedUsername.length > 50 ||
        nombre.trim().length > 100 ||
        apellido.trim().length > 100 ||
        Buffer.byteLength(password) < 8 ||
        Buffer.byteLength(password) > 72) {
      res.status(400).json({ error: "Revisa los datos: email inválido, campos demasiado largos o password fuera del rango de 8 a 72 bytes." });
      return;
    }

    const profile = parseProfile(getProfilePayload(body));
    if (!profile) {
      res.status(400).json({ error: "Los datos del perfil no son válidos." });
      return;
    }

    const input: RegistrationInput = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      usuario: normalizedUsername,
      email: normalizedEmail,
      password,
      profile,
    };

    try {
      const result = await authService.register(input);
      res.status(201).json({ message: "Registro exitoso.", ...result });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        res.status(409).json({ error: "El email o el usuario ya está registrado." });
        return;
      }
      respondWithError(res, "Error al registrar usuario:", error);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const body: unknown = req.body;
    if (!isRecord(body) || !isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
      res.status(400).json({ error: "email y password son obligatorios." });
      return;
    }

    try {
      const result = await authService.login(body.email.trim().toLowerCase(), body.password);
      if (!result) {
        res.status(401).json({ error: "Email o password incorrectos." });
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      respondWithError(res, "Error al iniciar sesión:", error);
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.authenticatedUserId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }

    try {
      const user = await authService.getProfile(req.authenticatedUserId);
      if (!user) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
      }
      res.status(200).json({ user });
    } catch (error) {
      respondWithError(res, "Error al consultar el perfil:", error);
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.authenticatedUserId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }

    const body: unknown = req.body;
    if (!isRecord(body)) {
      res.status(400).json({ error: "El cuerpo de la solicitud no es válido." });
      return;
    }

    const profilePayload = getProfilePayload(body);
    const profile = parseProfile(profilePayload);
    if (!isRecord(profilePayload) || !profile ||
        !profileFields.some((field) =>
          [field, ...profileAliases[field]].some((candidate) => candidate in profilePayload))) {
      res.status(400).json({ error: "Incluye al menos un campo de perfil válido." });
      return;
    }

    try {
      const user = await authService.updateProfile(req.authenticatedUserId, profile);
      if (!user) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
      }
      res.status(200).json({ message: "Perfil actualizado.", user });
    } catch (error) {
      respondWithError(res, "Error al actualizar el perfil:", error);
    }
  }

  async uploadProfilePhoto(req: Request, res: Response): Promise<void> {
    if (!req.authenticatedUserId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Envía la foto como un cuerpo binario no vacío." });
      return;
    }

    try {
      const saved = await authService.saveProfileBitmap(req.authenticatedUserId, req.body);
      if (!saved) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
      }
      res.status(200).json({ message: "Foto de perfil guardada." });
    } catch (error) {
      respondWithError(res, "Error al guardar la foto de perfil:", error);
    }
  }

  async getProfilePhoto(req: Request, res: Response): Promise<void> {
    if (!req.authenticatedUserId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }

    try {
      const bitmap = await authService.getProfileBitmap(req.authenticatedUserId);
      if (!bitmap) {
        res.status(404).json({ error: "El usuario todavía no tiene foto de perfil." });
        return;
      }
      res
        .status(200)
        .type("application/octet-stream")
        .set("Content-Length", String(bitmap.length))
        .send(bitmap);
    } catch (error) {
      respondWithError(res, "Error al consultar la foto de perfil:", error);
    }
  }
}
