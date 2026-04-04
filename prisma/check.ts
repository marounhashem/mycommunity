import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { compare } from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ["admin@terrastate.com", "manager1@terrastate.com", "MH1@terrastate.com", "HJ2@terrastate.com"] } },
    select: { email: true, role: true, hashedPassword: true },
  });

  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`  ${u.email} | ${u.role} | pw: ${u.hashedPassword ? "SET" : "NULL"}`);
    if (u.hashedPassword) {
      const testPw = u.role === "ADMIN" ? "Admin123!" : u.role === "MANAGER" ? "Manager123!" : "User123!";
      const match = await compare(testPw, u.hashedPassword);
      console.log(`    bcrypt compare("${testPw}") = ${match}`);
    }
  }

  const totalUsers = await prisma.user.count();
  const totalUnits = await prisma.unit.count();
  console.log(`\nTotal users: ${totalUsers}, Total units: ${totalUnits}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); });
