import { connectDB } from "./sequelize.js";
import { sequelize } from "./sequelize.js";
import { registerModels } from "../models/index.js";
import { DataTypes } from "sequelize";

export const initDatabase = async () => {
    await connectDB();
    registerModels();

    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const userTableExists = tables.some((table) => table.toLowerCase() === "users");
    if (userTableExists) {
        const userColumns = await queryInterface.describeTable("users");
        if (!("rol" in userColumns)) {
            await queryInterface.addColumn("users", "rol", {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "censista",
            });
            console.log('Added "users.rol"; existing users are censistas by default.');
        }
    }

    const profileTableExists = tables.some((table) =>
        table.toLowerCase() === "user_profiles"
    );

    if (profileTableExists) {
        const columns = await queryInterface.describeTable("user_profiles");
        const hasLegacyImageColumn = "imagen_base64" in columns;
        const hasBitmapColumn = "bitmap" in columns;

        if (hasLegacyImageColumn && hasBitmapColumn) {
            throw new Error(
                'Both "imagen_base64" and "bitmap" columns exist in "user_profiles"; resolve the duplicate columns before starting.'
            );
        }
        if (hasLegacyImageColumn) {
            await queryInterface.renameColumn("user_profiles", "imagen_base64", "bitmap");
            console.log('Renamed "user_profiles.imagen_base64" to "user_profiles.bitmap".');
        }

        const profileColumns = await queryInterface.describeTable("user_profiles");
        if ("bitmap" in profileColumns && !/bytea/i.test(profileColumns.bitmap.type)) {
            await sequelize.query(`
                ALTER TABLE "user_profiles"
                ALTER COLUMN "bitmap" TYPE BYTEA
                USING CASE
                    WHEN "bitmap" IS NULL OR "bitmap" = '' THEN NULL
                    ELSE decode(
                        regexp_replace("bitmap", '^data:image/[^;]+;base64,', '', 'i'),
                        'base64'
                    )
                END
            `);
            console.log('Converted "user_profiles.bitmap" from Base64 text to binary BYTEA.');
        }
    }

    await sequelize.sync();
    console.log("Database initialized successfully.");
};