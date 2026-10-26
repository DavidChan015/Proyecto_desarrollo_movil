import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.js";

export type CensusOrigin = "normal" | "masivo";

export class Census extends Model {
  public id!: number;
  public nombre!: string;
  public apellido!: string;
  public total_miembros!: number;
  public cantidad_televisores!: number;
  public latitud!: number;
  public longitud!: number;
  public origen!: CensusOrigin;
  public creado_por!: number | null;
  public createdAt!: Date;
}

Census.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    total_miembros: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cantidad_televisores: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    latitud: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitud: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    origen: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "normal",
    },
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    },
  },
  {
    sequelize,
    tableName: "censuses",
  }
);
