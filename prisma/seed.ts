import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const ZONES = ["A", "B", "C", "D"];

async function main() {
  console.log("Seeding...");

  // Create admin, managers
  const adminPw = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@terrastate.ae" },
    update: {},
    create: { email: "admin@terrastate.ae", role: "ADMIN", hashedPassword: adminPw },
  });

  const mgr1 = await prisma.user.upsert({
    where: { email: "manager1@terrastate.ae" },
    update: {},
    create: { email: "manager1@terrastate.ae", role: "MANAGER", hashedPassword: adminPw },
  });

  const mgr2 = await prisma.user.upsert({
    where: { email: "manager2@terrastate.ae" },
    update: {},
    create: { email: "manager2@terrastate.ae", role: "MANAGER", hashedPassword: adminPw },
  });

  // Create units and owners
  const ownerPw = await hash("owner123", 12);
  const units = [];
  const owners = [];

  for (let i = 1; i <= 20; i++) {
    const zone = ZONES[(i - 1) % 4];
    const unit = await prisma.unit.upsert({
      where: { id: `unit-${i}` },
      update: {},
      create: { id: `unit-${i}`, unitNumber: `V${String(i).padStart(3, "0")}`, zone, sqft: 2000 + i * 100 },
    });
    units.push(unit);

    const user = await prisma.user.upsert({
      where: { email: `owner${i}@example.com` },
      update: {},
      create: { email: `owner${i}@example.com`, role: "OWNER", hashedPassword: ownerPw },
    });

    const owner = await prisma.owner.create({
      data: { userId: user.id, unitId: unit.id, phone: `+971500000${String(i).padStart(3, "0")}` },
    }).catch(() => null); // skip if already exists
    if (owner) owners.push(owner);
  }

  // Create invoices — 4 quarters for each unit
  const periods = ["Q1", "Q2", "Q3", "Q4"];
  const year = 2026;

  for (const unit of units) {
    for (let q = 0; q < 4; q++) {
      const amount = 5000 + Math.floor(Math.random() * 3000);
      const dueDate = new Date(year, q * 3 + 2, 15); // Mar, Jun, Sep, Dec
      const rand = Math.random();
      const status = q < 2 ? (rand < 0.7 ? "PAID" : rand < 0.85 ? "OVERDUE" : "UNPAID") : (rand < 0.3 ? "PAID" : "UNPAID");

      const invoice = await prisma.invoice.create({
        data: {
          unitId: unit.id,
          amountAed: amount,
          dueDate,
          status: status as any,
          period: periods[q],
          year,
        },
      });

      if (status === "PAID") {
        const paidDate = new Date(dueDate);
        paidDate.setDate(paidDate.getDate() - Math.floor(Math.random() * 20));
        await prisma.payment.create({
          data: { invoiceId: invoice.id, amount, paidAt: paidDate },
        });
      }
    }
  }

  // Create tickets
  const categories = ["Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
  const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  for (let i = 0; i < 15; i++) {
    const unit = units[i % units.length];
    const createdAt = new Date(2026, Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1);
    await prisma.ticket.create({
      data: {
        unitId: unit.id,
        category: categories[i % categories.length],
        description: `Sample ticket ${i + 1} for unit ${unit.unitNumber}`,
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        createdAt,
      },
    });
  }

  // Create violations
  const rules = ["Noise After Hours", "Parking Violation", "Pet Policy Violation", "Common Area Misuse", "Waste Disposal Violation"];
  for (let i = 0; i < 5; i++) {
    await prisma.violation.create({
      data: {
        unitId: units[i * 4].id,
        issuedById: mgr1.id,
        ruleBreached: rules[i],
        description: `Violation notice for ${rules[i]}`,
        fineAmountAed: [500, 1000, 250, 750, 300][i],
        status: i < 3 ? "OPEN" : "RESOLVED",
        resolvedAt: i >= 3 ? new Date() : null,
      },
    });
  }

  console.log("Seed complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
