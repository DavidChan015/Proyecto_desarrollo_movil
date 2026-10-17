import { User } from "./UserModel.js";
import { UserProfile } from "./UserProfileModel.js";

export const registerModels = () => {
    User.hasOne(UserProfile, { foreignKey: "user_id", as: "profile", onDelete: "CASCADE" });
    UserProfile.belongsTo(User, { foreignKey: "user_id", as: "user" });

    return { User, UserProfile };
};
