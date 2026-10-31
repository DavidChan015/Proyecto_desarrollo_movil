import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.js";

export class LivenessSession extends Model {
  public session_id!: string;
  public user_id!: number;
  public status!: string;
}

LivenessSession.init(
  {
    session_id: {
      type: DataTypes.STRING(128),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "CREATED",
    },
  },
  {
    sequelize,
    tableName: "liveness_sessions",
    updatedAt: false,
  },
);
