const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const jacekPass = await bcrypt.hash("jacek123", 10);
  const stefPass = await bcrypt.hash("stefania123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPass, role: "admin" },
  });

  await prisma.user.upsert({
    where: { username: "jacek" },
    update: {},
    create: { username: "jacek", password: jacekPass, role: "user-tester" },
  });

  await prisma.user.upsert({
    where: { username: "stefania" },
    update: {},
    create: { username: "stefania", password: stefPass, role: "user" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
