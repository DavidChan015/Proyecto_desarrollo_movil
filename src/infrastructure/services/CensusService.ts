import { Census, CensusOrigin } from "../models/CensusModel.js";

export interface CensusInput {
  nombre: string;
  apellido: string;
  total_miembros: number;
  cantidad_televisores: number;
  latitud: number;
  longitud: number;
}

export class CensusService {
  async create(input: CensusInput, userId: number): Promise<Census> {
    return Census.create({
      ...input,
      origen: "normal",
      creado_por: userId,
    });
  }

  async list(origen?: CensusOrigin, creadoPor?: number): Promise<Census[]> {
    return Census.findAll({
      ...(origen || creadoPor !== undefined
        ? { where: { ...(origen ? { origen } : {}), ...(creadoPor !== undefined ? { creado_por: creadoPor } : {}) } }
        : {}),
      order: [["createdAt", "DESC"], ["id", "DESC"]],
    });
  }
}
