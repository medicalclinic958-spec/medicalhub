import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      roleSlug: string;
      permissions: string[];
      isSuperAdmin: boolean;
      avatar?: string;
      status: string;
      mustChangePassword: boolean;
    };
  }
  interface JWT {
    id: string;
    fullName: string;
    role: string;
    roleSlug: string;
    permissions: string[];
    isSuperAdmin: boolean;
    avatar?: string;
    status: string;
    mustChangePassword: boolean;
  }
}