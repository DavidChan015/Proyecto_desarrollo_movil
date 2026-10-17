import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

export const sequelize = new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "postgres",
    logging: false,
  }
);

  const ensureDatabaseExists = async () => {
    const dbName = process.env.DB_NAME;
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (!dbName || !host || !port || !user || !password) {
      throw new Error("Database configuration is incomplete in environment variables.");
    }

    const adminClient = new Client({
      host,
      port,
      user,
      password,
      database: "postgres",
    });

    try {
      await adminClient.connect();
      const result = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );

      if (result.rowCount === 0) {
        const escapedDbName = dbName.replace(/"/g, '""');
        await adminClient.query(`CREATE DATABASE "${escapedDbName}"`);
        console.log(`Database "${dbName}" was created automatically.`);
      }
    } finally {
      await adminClient.end();
    }
  };

export const connectDB = async () => {
    try {
      await ensureDatabaseExists();
        await sequelize.authenticate();
      await sequelize.query('CREATE SCHEMA IF NOT EXISTS public');
      await sequelize.query('SET search_path TO public');
        console.log("Connected to the database successfully.");
    } catch (error) {
        console.error("Failed to connect to the database:", error);
      throw error;
    }
}; 