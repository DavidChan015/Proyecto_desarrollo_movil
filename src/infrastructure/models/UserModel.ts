import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.js";

export class User extends Model {

    public id!: number;
    public nombre!: string;
    public apellido!: string;
    public usuario!: string;
    public email!: string;
    public password_hash!: string;
    public rol!: "censista" | "administrador";
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER, 
            
            autoIncrement: true,
            primaryKey: true,
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apellido: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        usuario: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        rol: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "censista",
        }
    },
    {
        sequelize,
        tableName: "users"
    }
);
