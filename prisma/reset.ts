import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  Resetting database — deleting all data...\n");

  // Delete in reverse dependency order (children before parents)

  console.log("  Deleting audit logs...");
  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`    ${auditLogs.count} audit logs deleted`);

  console.log("  Deleting notification logs...");
  const notifLogs = await prisma.notificationLog.deleteMany();
  console.log(`    ${notifLogs.count} notification logs deleted`);

  console.log("  Deleting announcements...");
  const announcements = await prisma.announcement.deleteMany();
  console.log(`    ${announcements.count} announcements deleted`);

  console.log("  Deleting renovation attachments...");
  const renAttachments = await prisma.renovationAttachment.deleteMany();
  console.log(`    ${renAttachments.count} renovation attachments deleted`);

  console.log("  Deleting renovation applications...");
  const renovations = await prisma.renovationApplication.deleteMany();
  console.log(`    ${renovations.count} renovation applications deleted`);

  console.log("  Deleting violations...");
  const violations = await prisma.violation.deleteMany();
  console.log(`    ${violations.count} violations deleted`);

  console.log("  Deleting ticket attachments...");
  const ticketAttachments = await prisma.ticketAttachment.deleteMany();
  console.log(`    ${ticketAttachments.count} ticket attachments deleted`);

  console.log("  Deleting ticket comments...");
  const ticketComments = await prisma.ticketComment.deleteMany();
  console.log(`    ${ticketComments.count} ticket comments deleted`);

  console.log("  Deleting tickets...");
  const tickets = await prisma.ticket.deleteMany();
  console.log(`    ${tickets.count} tickets deleted`);

  console.log("  Deleting payments...");
  const payments = await prisma.payment.deleteMany();
  console.log(`    ${payments.count} payments deleted`);

  console.log("  Deleting invoices...");
  const invoices = await prisma.invoice.deleteMany();
  console.log(`    ${invoices.count} invoices deleted`);

  console.log("  Deleting owners...");
  const owners = await prisma.owner.deleteMany();
  console.log(`    ${owners.count} owners deleted`);

  console.log("  Deleting units...");
  const units = await prisma.unit.deleteMany();
  console.log(`    ${units.count} units deleted`);

  console.log("  Deleting verification tokens...");
  const tokens = await prisma.verificationToken.deleteMany();
  console.log(`    ${tokens.count} verification tokens deleted`);

  console.log("  Deleting users...");
  const users = await prisma.user.deleteMany();
  console.log(`    ${users.count} users deleted`);

  console.log("\n✅ Database reset complete — all tables empty, structure intact.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
