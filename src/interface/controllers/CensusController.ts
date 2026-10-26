import { Request, Response } from "express";
import { Census } from "../../infrastructure/models/CensusModel.js";
import { User } from "../../infrastructure/models/UserModel.js";
import { CensusService } from "../../infrastructure/services/CensusService.js";

const censusService = new CensusService();

type RecordValue = Record<string, unknown>;

const GUATEMALA_BOUNDS = {
  latitude: { minimum: 13.7, maximum: 17.9 },
  longitude: { minimum: -92.3, maximum: -88.2 },
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCoordinate = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;

const isIntegerInRange = (value: unknown, minimum: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;

const serializeCensus = (census: Census) => ({
  id: census.id,
  nombre: census.nombre,
  apellido: census.apellido,
  total_miembros: census.total_miembros,
  cantidad_televisores: census.cantidad_televisores,
  latitud: census.latitud,
  longitud: census.longitud,
  latitude: census.latitud,
  longitude: census.longitud,
  origen: census.origen,
  tipo_carga: census.origen === "masivo" ? "MASIVO" : "NORMAL",
  es_masivo: census.origen === "masivo",
  creado_por: census.creado_por,
  createdAt: census.createdAt,
});

const respondWithError = (res: Response, message: string, error: unknown): void => {
  console.error(message, error);
  res.status(500).json({ error: "Error interno del servidor." });
};

export class CensusController {
  async create(req: Request, res: Response): Promise<void> {
    const body: unknown = req.body;
    if (!req.authenticatedUserId) {
      res.status(401).json({ error: "Autenticación requerida." });
      return;
    }
    if (!isRecord(body)) {
      res.status(400).json({ error: "El cuerpo de la solicitud no es válido." });
      return;
    }

    const { nombre, apellido, total_miembros, cantidad_televisores } = body;
    const latitud = body.latitud ?? body.latitude;
    const longitud = body.longitud ?? body.longitude;
    if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 100 ||
        typeof apellido !== "string" || !apellido.trim() || apellido.trim().length > 100 ||
        !isIntegerInRange(total_miembros, 1) ||
        !isIntegerInRange(cantidad_televisores, 0) ||
        !isCoordinate(latitud, GUATEMALA_BOUNDS.latitude.minimum, GUATEMALA_BOUNDS.latitude.maximum) ||
        !isCoordinate(longitud, GUATEMALA_BOUNDS.longitude.minimum, GUATEMALA_BOUNDS.longitude.maximum)) {
      res.status(400).json({
        error: "Envía nombre, apellido, total_miembros (mínimo 1), cantidad_televisores (mínimo 0) y coordenadas dentro de Guatemala.",
      });
      return;
    }

    try {
      const census = await censusService.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        total_miembros,
        cantidad_televisores,
        latitud,
        longitud,
      }, req.authenticatedUserId);
      res.status(201).json({ message: "Censo capturado.", census: serializeCensus(census) });
    } catch (error) {
      respondWithError(res, "Error al guardar el censo:", error);
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = await User.findByPk(req.authenticatedUserId, { attributes: ["rol"] });
      if (!user) {
        res.status(401).json({ error: "El usuario autenticado ya no existe." });
        return;
      }

      const censuses = await censusService.list(
        undefined,
        user.rol === "administrador" ? undefined : req.authenticatedUserId
      );
      res.status(200).json({ censuses: censuses.map(serializeCensus) });
    } catch (error) {
      respondWithError(res, "Error al consultar los censos:", error);
    }
  }

  async listMassive(req: Request, res: Response): Promise<void> {
    try {
      const censuses = await censusService.list("masivo");
      res.status(200).json({ censuses: censuses.map(serializeCensus) });
    } catch (error) {
      respondWithError(res, "Error al consultar los censos masivos:", error);
    }
  }
}
