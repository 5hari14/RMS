import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      timezone: "America/New_York",
      currency: "USD",
      email: "info@demo-restaurant.com",
      phone: "+1 555-0100",
      address: "123 Main Street",
      city: "New York",
      state: "NY",
      postcode: "10001",
      country: "US",
    },
  });

  console.log(`Restaurant: ${restaurant.name} (${restaurant.id})`);

  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "owner@demo.com", name: "Alice Owner", role: UserRole.OWNER },
    { email: "manager@demo.com", name: "Bob Manager", role: UserRole.MANAGER },
    { email: "host@demo.com", name: "Carol Host", role: UserRole.HOST },
  ] as const;

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
        restaurantId: restaurant.id,
      },
    });
    console.log(`User: ${user.name} (${user.email}) — ${user.role}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
