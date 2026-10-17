import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.js";

export class User extends Model {

    public id!: number;
    public nombre!: string;
    public apellido!: string;
    public usuario!: string;
    public email!: string;
    public password_hash!: string;
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
        }
    },
    {
        sequelize,
        tableName: "users"
    }
);
