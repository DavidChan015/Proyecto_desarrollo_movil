import { User } from "./UserModel.js";
import { UserProfile } from "./UserProfileModel.js";
import { Census } from "./CensusModel.js";

export const registerModels = () => {
    User.hasOne(UserProfile, { foreignKey: "user_id", as: "profile", onDelete: "CASCADE" });
    UserProfile.belongsTo(User, { foreignKey: "user_id", as: "user" });
    User.hasMany(Census, { foreignKey: "creado_por", as: "censuses", onDelete: "SET NULL" });
    Census.belongsTo(User, { foreignKey: "creado_por", as: "censista" });

    return { User, UserProfile, Census };
};
