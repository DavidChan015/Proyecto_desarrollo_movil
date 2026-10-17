import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.js";

export class UserProfile extends Model {

    public id!: number;
    public user_id!: number;
    public telefono!: string | null;
    public bio!: string | null;
    public fecha_cumpleanos!: string | null;
    public genero!: string | null;
    public bitmap!: Buffer | null;
   
}

UserProfile.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: "users",
      key: "id",
    },
    onDelete: "CASCADE",
  },
  telefono: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  bio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fecha_cumpleanos: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  genero: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bitmap: {
    type: DataTypes.BLOB,
    allowNull: true,
  },
},
{
  sequelize,
  tableName: "user_profiles",
});
