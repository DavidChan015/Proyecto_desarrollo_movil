import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Transaction } from "sequelize";
import { getJwtSecret } from "../../config/auth.js";
import { sequelize } from "../database/sequelize.js";
import { User } from "../models/UserModel.js";
import { UserProfile } from "../models/UserProfileModel.js";

export interface ProfileInput {
  telefono?: string | null;
  bio?: string | null;
  fecha_cumpleanos?: string | null;
  genero?: string | null;
}

export interface RegistrationInput {
  nombre: string;
  apellido: string;
  usuario: string;
  email: string;
  password: string;
  profile: ProfileInput;
}

export interface PublicProfile {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  email: string;
  telefono: string | null;
  bio: string | null;
  fecha_cumpleanos: string | null;
  genero: string | null;
  foto_disponible: boolean;
}

export interface PublicUser {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  email: string;
  profile: PublicProfile | null;
}

export class AuthService {
  async register(input: RegistrationInput): Promise<{ token: string; user: PublicUser }> {
    const user = await sequelize.transaction(async (transaction: Transaction) => {
      const createdUser = await User.create({
        nombre: input.nombre,
        apellido: input.apellido,
        usuario: input.usuario,
        email: input.email,
        password_hash: await bcrypt.hash(input.password, 12),
      }, { transaction });

      await UserProfile.create({
        user_id: createdUser.id,
        telefono: input.profile.telefono ?? null,
        bio: input.profile.bio ?? null,
        fecha_cumpleanos: input.profile.fecha_cumpleanos ?? null,
        genero: input.profile.genero ?? null,
      }, { transaction });

      return createdUser;
    });

    const publicUser = await this.getProfile(user.id);
    if (!publicUser) {
      throw new Error("Registered user could not be loaded.");
    }

    return { token: this.createToken(user.id), user: publicUser };
  }

  async login(email: string, password: string): Promise<{ token: string; user: PublicUser } | null> {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return null;
    }

    const publicUser = await this.getProfile(user.id);
    if (!publicUser) {
      throw new Error("Authenticated user could not be loaded.");
    }

    return { token: this.createToken(user.id), user: publicUser };
  }

  async getProfile(userId: number): Promise<PublicUser | null> {
    const user = await User.findByPk(userId, {
      attributes: ["id", "nombre", "apellido", "usuario", "email"],
    });
    if (!user) {
      return null;
    }

    const profile = await UserProfile.findOne({ where: { user_id: userId } });
    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      usuario: user.usuario,
      email: user.email,
      profile: profile
        ? {
            id: profile.id,
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            email: user.email,
            telefono: profile.telefono,
            bio: profile.bio,
            fecha_cumpleanos: profile.fecha_cumpleanos,
            genero: profile.genero,
            foto_disponible: profile.bitmap !== null,
          }
        : null,
    };
  }

  async updateProfile(userId: number, input: ProfileInput): Promise<PublicUser | null> {
    if (!(await User.findByPk(userId))) {
      return null;
    }

    await sequelize.transaction(async (transaction: Transaction) => {
      const [profile] = await UserProfile.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
        transaction,
      });

      if (input.telefono !== undefined) profile.telefono = input.telefono;
      if (input.bio !== undefined) profile.bio = input.bio;
      if (input.fecha_cumpleanos !== undefined) profile.fecha_cumpleanos = input.fecha_cumpleanos;
      if (input.genero !== undefined) profile.genero = input.genero;

      await profile.save({ transaction });
    });

    return this.getProfile(userId);
  }

  async saveProfileBitmap(userId: number, bitmap: Buffer): Promise<boolean> {
    return sequelize.transaction(async (transaction: Transaction) => {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        return false;
      }

      const [profile] = await UserProfile.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
        transaction,
      });
      profile.bitmap = bitmap;
      await profile.save({ transaction });

      return true;
    });
  }

  async getProfileBitmap(userId: number): Promise<Buffer | null> {
    const profile = await UserProfile.findOne({
      where: { user_id: userId },
      attributes: ["bitmap"],
    });
    return profile?.bitmap ?? null;
  }

  private createToken(userId: number): string {
    return jwt.sign({ sub: String(userId) }, getJwtSecret(), { expiresIn: "1h" });
  }
}
