/** Roles available in the system, ordered by privilege level. */
export type UserRole = "owner" | "manager" | "host" | "staff";

/** Base entity fields shared across all tenant-scoped models. */
export interface TenantEntity {
  id: string;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}
