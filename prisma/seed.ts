import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      name,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  console.log(`Created admin user "${username}" with temporary password "${password}".`);
  console.log("Log in and change this password immediately.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
