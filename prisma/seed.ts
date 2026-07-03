import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email) {
    console.log("SEED_ADMIN_EMAIL is not set, skipping admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user "${email}" already exists, skipping.`);
    return;
  }

  await prisma.user.create({
    data: { email, name, role: "ADMIN" },
  });

  console.log(`Created admin user "${email}". They can now sign in with Google.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
