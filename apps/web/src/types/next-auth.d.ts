import type { UserRole } from "@bites-rms/db";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    restaurantId: string;
    restaurantName: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      restaurantId: string;
      restaurantName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    restaurantId: string;
    restaurantName: string;
  }
}
