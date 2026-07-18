import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";

function extractPermissions(role: unknown): string[] {
  const roleRecord = role as Record<string, unknown> | null | undefined;
  if (!Array.isArray(roleRecord?.permissions)) return [];
  return (roleRecord.permissions as Record<string, string>[]).map(
    (permission) => `${permission.module}:${permission.action}`
  );
}

async function syncTokenFromDb(token: Record<string, unknown>) {
  await connectDB();
  const dbUser = await User.findById(token.id)
    .populate({ path: "role", populate: { path: "permissions" } })
    .lean();

  if (!dbUser) {
    token.status = "inactive";
    token.permissions = [];
    token.isSuperAdmin = false;
    return token;
  }

  const role = dbUser.role as Record<string, unknown> | null | undefined;

  token.status = dbUser.status;
  token.mustChangePassword = dbUser.mustChangePassword;
  token.isSuperAdmin = dbUser.isSuperAdmin;
  token.role = role ? (role as { name: string }).name : undefined;
  token.roleSlug = role ? (role as { slug: string }).slug : undefined;
  token.permissions = extractPermissions(role);

  return token;
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email })
          .select("+password")
          .populate({ path: "role", populate: { path: "permissions" } })
          .lean();

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (user.status === "inactive" || user.status === "suspended") {
          throw new Error("Your account is not active. Contact admin.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password as string);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        const role = user.role as Record<string, unknown>;
        const permissions = extractPermissions(role);

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          fullName: `${user.firstName} ${user.lastName}`,
          role: (role as { name: string }).name,
          roleSlug: (role as { slug: string }).slug,
          permissions,
          isSuperAdmin: user.isSuperAdmin,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
        } as Record<string, unknown>;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }: { token: Record<string, unknown>; user?: Record<string, unknown>; trigger?: string }) {
      if (user) {
        token.id = user.id;
        token.fullName = user.fullName;
        token.role = user.role;
        token.roleSlug = user.roleSlug;
        token.permissions = user.permissions;
        token.isSuperAdmin = user.isSuperAdmin;
        token.status = user.status;
        token.mustChangePassword = user.mustChangePassword;
      } else if (token.id) {
        await syncTokenFromDb(token);
      }

      return token;
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      const user = session.user as Record<string, unknown>;
      user.id = token.id;
      user.fullName = token.fullName;
      user.role = token.role;
      user.roleSlug = token.roleSlug;
      user.permissions = token.permissions;
      user.isSuperAdmin = token.isSuperAdmin;
      user.status = token.status;
      user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const, maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};

export const auth = () => {
  const { getServerSession } = require("next-auth");
  return getServerSession(authOptions);
};