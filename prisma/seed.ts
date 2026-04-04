import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// ──────────────────────────────────────
// Name pools
// ──────────────────────────────────────

const ARABIC_FIRST = [
  "Ahmed", "Mohammed", "Khalid", "Omar", "Youssef", "Hassan", "Ali", "Ibrahim",
  "Saeed", "Rashid", "Tariq", "Faisal", "Sultan", "Hamad", "Nasser", "Waleed",
  "Majid", "Fahad", "Salim", "Zayed", "Adel", "Jamal", "Karim", "Marwan",
  "Hani", "Rami", "Sami", "Wael", "Bassam", "Nabil", "Amira", "Fatima",
  "Layla", "Noura", "Sara", "Maryam", "Aisha", "Huda", "Dalal", "Reem",
  "Lina", "Dana", "Hala", "Mona", "Nada", "Rana", "Dina", "Samira",
];

const ARABIC_LAST = [
  "Al Maktoum", "Al Nahyan", "Al Qasimi", "Al Nuaimi", "Al Sharqi",
  "Al Mualla", "Al Falasi", "Al Ketbi", "Al Mansoori", "Al Dhaheri",
  "Al Suwaidi", "Al Mazrouei", "Al Shamsi", "Al Zaabi", "Al Rashidi",
  "Al Ameri", "Al Kaabi", "Al Hammadi", "Al Marzooqi", "Al Blooshi",
  "Al Hosani", "Al Balooshi", "Al Shehhi", "Al Tayer", "Al Remeithi",
];

const WESTERN_FIRST = [
  "James", "Robert", "Michael", "David", "Richard", "Thomas", "Charles",
  "Daniel", "Matthew", "Andrew", "Sarah", "Emma", "Jessica", "Emily",
  "Sophie", "Charlotte", "Elizabeth", "Victoria", "Alexandra", "Catherine",
  "Patrick", "Sean", "Brian", "Kevin", "Mark", "Paul", "John", "Peter",
  "George", "William", "Anna", "Maria", "Julia", "Claire", "Helen",
];

const WESTERN_LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis",
  "Wilson", "Anderson", "Taylor", "Thompson", "White", "Harris", "Martin",
  "Clark", "Lewis", "Walker", "Hall", "Young", "King", "Wright", "Scott",
  "Green", "Baker", "Adams", "Nelson", "Carter", "Mitchell", "Roberts",
  "Campbell", "O'Brien", "Murphy", "Kelly", "Sullivan", "Reid", "Stewart",
];

// ──────────────────────────────────────
// Ticket descriptions
// ──────────────────────────────────────

const TICKET_DESCRIPTIONS: Record<string, string[]> = {
  Maintenance: [
    "AC unit in master bedroom is making loud rattling noise and not cooling properly",
    "Water leak detected under kitchen sink, causing damage to cabinet base",
    "Front door lock mechanism is jammed, key turns but deadbolt won't engage",
    "Ceiling fan in living room wobbles dangerously at medium and high speeds",
    "Hot water heater not producing hot water, pilot light appears to be out",
    "Garage door opener stopped working, motor runs but door doesn't move",
    "Bathroom exhaust fan making grinding noise and barely pulling air",
    "Cracked tile in entryway, sharp edges exposed — safety hazard",
  ],
  Cleaning: [
    "Common area pool deck has algae buildup near the shallow end",
    "Lobby carpet needs deep cleaning — visible stains from recent event",
    "Bird droppings accumulated on villa rooftop and balcony railing",
    "Garbage bins area has strong odor, needs pressure washing",
    "Gym equipment surfaces need sanitization — sticky residue on handles",
    "Window cleaning needed for external glass panels on second floor",
    "Kids play area sand pit needs replacement — debris and dirt accumulated",
    "Garden pathway pavers covered with moss, slippery when wet",
  ],
  Security: [
    "CCTV camera at zone entrance appears to be offline for 3 days",
    "Gate barrier arm not lowering after vehicle passes through",
    "Motion sensor light at back garden not activating at night",
    "Intercom system between gate and villa unit is not connecting",
    "Unauthorized vehicle parked in reserved visitor spot for 5 days",
    "Perimeter fence section near lagoon has a gap that needs repair",
    "Emergency exit signage light burned out in underground parking",
    "Access card reader at gym entrance intermittently fails",
  ],
  Landscaping: [
    "Palm tree in front garden leaning dangerously after recent windstorm",
    "Irrigation sprinkler head broken, water spraying onto walkway",
    "Hedges along property boundary overgrown and blocking pathway",
    "Dead patches of grass appearing in community lawn area",
    "Flower beds in common area need replanting — seasonal rotation due",
    "Tree roots lifting pavement near villa entrance, trip hazard",
    "Garden lighting along main pathway has 4 fixtures not working",
    "Bougainvillea vine overgrown and blocking villa window",
  ],
  Other: [
    "Mailbox lock needs replacement — current key no longer works",
    "Community noticeboard glass panel cracked, needs replacement",
    "Speed bump paint faded, barely visible to drivers at night",
    "BBQ area grill needs maintenance — gas connection leaking slightly",
    "Tennis court net torn and sagging, needs replacement",
    "Community WiFi in clubhouse extremely slow during evening hours",
    "Children's playground swing set chain rusted, needs replacement",
    "Parking lot line markings faded, causing confusion about spaces",
  ],
};

// ──────────────────────────────────────
// Announcements
// ──────────────────────────────────────

const ANNOUNCEMENTS = [
  {
    title: "Annual General Meeting — April 2026",
    body: "<p>Dear Residents,</p><p>We are pleased to invite you to the Annual General Meeting of The Cove Rotana Resort Community. The meeting will cover the 2025 financial review, 2026 budget approval, and community improvement proposals.</p><p><strong>Date:</strong> Saturday, April 18, 2026<br><strong>Time:</strong> 6:00 PM<br><strong>Venue:</strong> Community Clubhouse</p><p>Your attendance and participation are highly valued.</p>",
    audience: "ALL" as const,
  },
  {
    title: "Scheduled Water Supply Interruption — Beachfront Zone",
    body: "<p>Please be advised that there will be a scheduled water supply interruption in the <strong>Beachfront Zone</strong> on Wednesday, March 25, 2026, from 9:00 AM to 3:00 PM.</p><p>This is necessary for pipeline maintenance work. We recommend storing sufficient water for the duration.</p><p>We apologize for any inconvenience.</p>",
    audience: "ZONE" as const,
    zone: "Beachfront",
  },
  {
    title: "New Recycling Program Launch",
    body: "<p>We are excited to announce the launch of our new community recycling program starting April 1, 2026.</p><p>Separate bins for <strong>paper, plastic, glass,</strong> and <strong>organic waste</strong> will be placed at designated collection points in each zone.</p><p>A detailed guide will be delivered to each villa. Together, we can make our community more sustainable!</p>",
    audience: "ALL" as const,
  },
  {
    title: "Pool Maintenance Schedule Update",
    body: "<p>The community pool will undergo its quarterly deep cleaning and equipment inspection from <strong>March 18-20, 2026</strong>.</p><p>During this period, the pool and surrounding deck area will be closed. The gym and clubhouse will remain open as usual.</p><p>Thank you for your understanding.</p>",
    audience: "ALL" as const,
  },
  {
    title: "Ramadan Community Iftar Invitation",
    body: "<p>In the spirit of Ramadan, we are organizing a community Iftar gathering on <strong>Saturday, March 14, 2026</strong> at the Clubhouse Garden.</p><p>All residents and their families are warmly invited. Please RSVP by March 10 to help us with catering arrangements.</p><p>Ramadan Kareem to all!</p>",
    audience: "ALL" as const,
  },
  {
    title: "Lagoon Zone — Landscaping Upgrade",
    body: "<p>We are pleased to inform Lagoon Zone residents that a landscaping upgrade project will commence on <strong>March 5, 2026</strong>.</p><p>Work includes new irrigation installation, ornamental planting, and pathway resurfacing. Expected completion is April 15, 2026.</p><p>Some temporary access changes may occur. Signage will be posted.</p>",
    audience: "ZONE" as const,
    zone: "Lagoon",
  },
  {
    title: "Security System Upgrade Notice",
    body: "<p>As part of our ongoing commitment to resident safety, we are upgrading the CCTV and access control systems across all zones.</p><p>Technicians will be on-site from <strong>February 20 to March 5, 2026</strong>. You may notice temporary installations and brief interruptions to gate access.</p><p>New access cards will be distributed once the upgrade is complete.</p>",
    audience: "ALL" as const,
  },
  {
    title: "Hillside Zone — Road Resurfacing",
    body: "<p>Road resurfacing work in the Hillside Zone is scheduled for <strong>February 10-17, 2026</strong>.</p><p>Alternate routes will be signposted. Please drive carefully through the work zone and follow security team instructions.</p>",
    audience: "ZONE" as const,
    zone: "Hillside",
  },
  {
    title: "Q1 2026 Service Charge Reminder",
    body: "<p>This is a friendly reminder that Q1 2026 service charges are due by <strong>January 31, 2026</strong>.</p><p>Invoices have been issued to all unit owners. Please ensure timely payment to avoid late fees.</p><p>For any billing inquiries, contact the management office.</p>",
    audience: "ALL" as const,
  },
  {
    title: "Community Rules Refresher",
    body: "<p>As we welcome new residents, we'd like to share a refresher on key community guidelines:</p><ul><li>Quiet hours: 10:00 PM – 7:00 AM</li><li>Pets must be leashed in common areas</li><li>Visitor parking is for guests only (max 48 hours)</li><li>All exterior modifications require management approval</li><li>Waste disposal: designated bins only, no dumping</li></ul><p>Full community bylaws are available at the management office.</p>",
    audience: "ALL" as const,
  },
];

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefix = randomItem(["50", "52", "54", "55", "56", "58"]);
  const number = String(randomInt(1000000, 9999999));
  return `+971${prefix}${number}`;
}

function generateName(index: number): { first: string; last: string; email: string } {
  // ~70% Arabic names, ~30% Western
  const isArabic = index % 10 < 7;
  const first = isArabic ? randomItem(ARABIC_FIRST) : randomItem(WESTERN_FIRST);
  const last = isArabic ? randomItem(ARABIC_LAST) : randomItem(WESTERN_LAST);
  const emailSafe = `${first.toLowerCase()}.${last.toLowerCase().replace(/ /g, "")}`;
  const email = `${emailSafe}${index}@email.com`;
  return { first, last, email };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ──────────────────────────────────────
// Main seed
// ──────────────────────────────────────

async function main() {
  console.log("🌱 Seeding The Cove Rotana Resort community data...\n");

  const pw = await hash("Admin123!", 12);
  const mgrPw = await hash("Manager123!", 12);
  const ownerPw = await hash("User123!", 12);

  // ── Staff users ──
  console.log("Creating admin and manager users...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@terrastate.com" },
    update: {},
    create: { email: "admin@terrastate.com", role: "ADMIN", hashedPassword: pw },
  });
  const mgr1 = await prisma.user.upsert({
    where: { email: "manager1@terrastate.com" },
    update: {},
    create: { email: "manager1@terrastate.com", role: "MANAGER", hashedPassword: mgrPw },
  });
  const mgr2 = await prisma.user.upsert({
    where: { email: "manager2@terrastate.com" },
    update: {},
    create: { email: "manager2@terrastate.com", role: "MANAGER", hashedPassword: mgrPw },
  });

  // ── Named owner accounts ──
  const mh1 = await prisma.user.upsert({
    where: { email: "MH1@terrastate.com" },
    update: {},
    create: { email: "MH1@terrastate.com", role: "OWNER", hashedPassword: ownerPw },
  });
  const hj2 = await prisma.user.upsert({
    where: { email: "HJ2@terrastate.com" },
    update: {},
    create: { email: "HJ2@terrastate.com", role: "OWNER", hashedPassword: ownerPw },
  });

  const managers = [mgr1, mgr2];

  // ── Zones config ──
  const ZONES = [
    { name: "Hillside", count: 65, prefix: "H" },
    { name: "Beachfront", count: 60, prefix: "B" },
    { name: "Lagoon", count: 60, prefix: "L" },
  ];

  // ── Units + Owners ──
  console.log("Creating 185 units and owners...");
  const allUnits: { id: string; unitNumber: string; zone: string; sqft: number }[] = [];
  const allOwnerUsers: { id: string; email: string }[] = [];

  let unitIndex = 0;
  for (const zone of ZONES) {
    for (let i = 1; i <= zone.count; i++) {
      unitIndex++;
      const unitNumber = `${zone.prefix}${String(i).padStart(3, "0")}`;
      const sqft = randomInt(2200, 2800);

      // Assign named accounts to first two units
      let ownerUser: { id: string; email: string };
      if (unitIndex === 1) {
        ownerUser = mh1;
      } else if (unitIndex === 2) {
        ownerUser = hj2;
      } else {
        const name = generateName(unitIndex);
        ownerUser = await prisma.user.upsert({
          where: { email: name.email },
          update: {},
          create: { email: name.email, role: "OWNER", hashedPassword: ownerPw },
        });
      }

      const unit = await prisma.unit.create({
        data: {
          unitNumber,
          zone: zone.name,
          sqft,
          ownerId: ownerUser.id,
        },
      });

      await prisma.owner.create({
        data: {
          userId: ownerUser.id,
          unitId: unit.id,
          phone: generatePhone(),
        },
      }).catch(() => null); // skip duplicates

      allUnits.push(unit);
      allOwnerUsers.push(ownerUser);
    }
  }

  // ── Invoices + Payments ──
  console.log("Creating invoices for 2024 and 2025...");
  const periods = [
    { period: "Q1", month: 0 },
    { period: "Q2", month: 3 },
    { period: "Q3", month: 6 },
    { period: "Q4", month: 9 },
  ];

  for (const unit of allUnits) {
    const annualCharge = unit.sqft * 12;
    const quarterlyCharge = Math.round(annualCharge / 4);

    for (const year of [2024, 2025]) {
      for (const { period, month } of periods) {
        const dueDate = new Date(year, month + 2, 15); // end of quarter month
        const now = new Date();

        // Determine status
        let status: "PAID" | "UNPAID" | "OVERDUE";
        if (year === 2024) {
          // 2024: mostly paid
          const rand = Math.random();
          status = rand < 0.85 ? "PAID" : rand < 0.93 ? "OVERDUE" : "UNPAID";
        } else {
          // 2025: Q1-Q2 mostly paid, Q3-Q4 more unpaid
          const rand = Math.random();
          if (month <= 3) {
            status = rand < 0.75 ? "PAID" : rand < 0.88 ? "OVERDUE" : "UNPAID";
          } else if (month <= 6) {
            status = rand < 0.55 ? "PAID" : rand < 0.75 ? "OVERDUE" : "UNPAID";
          } else {
            status = rand < 0.3 ? "PAID" : rand < 0.5 ? "OVERDUE" : "UNPAID";
          }
        }

        // If due date is in the future, can't be overdue
        if (dueDate > now && status === "OVERDUE") {
          status = "UNPAID";
        }

        const invoice = await prisma.invoice.create({
          data: {
            unitId: unit.id,
            amountAed: quarterlyCharge,
            dueDate,
            status,
            period,
            year,
          },
        });

        if (status === "PAID") {
          const paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() - randomInt(1, 25));
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: quarterlyCharge,
              paidAt: paidDate,
            },
          });
        }
      }
    }
  }

  // ── Tickets ──
  console.log("Creating 40 tickets...");
  const categories = Object.keys(TICKET_DESCRIPTIONS);
  const ticketStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  for (let i = 0; i < 40; i++) {
    const category = categories[i % categories.length];
    const descriptions = TICKET_DESCRIPTIONS[category];
    const description = descriptions[i % descriptions.length];
    const unit = allUnits[randomInt(0, allUnits.length - 1)];
    const status = ticketStatuses[i % ticketStatuses.length];
    const priority = ticketPriorities[randomInt(0, 3)];
    const createdAt = daysAgo(randomInt(1, 180));
    const assignee = status !== "OPEN" ? randomItem(managers) : null;

    const ticket = await prisma.ticket.create({
      data: {
        unitId: unit.id,
        category,
        description,
        priority,
        status,
        assignedTo: assignee?.id ?? null,
        createdAt,
        satisfactionScore: status === "CLOSED" ? randomInt(3, 5) : null,
      },
    });

    // Add comments to non-open tickets
    if (status !== "OPEN") {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: randomItem(managers).id,
          body: `We've received your request regarding ${category.toLowerCase()}. Our team has been assigned and will address this promptly.`,
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 3600000),
        },
      });

      if (status === "IN_PROGRESS" || status === "RESOLVED" || status === "CLOSED") {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: randomItem(managers).id,
            body: `Internal note: Scheduled maintenance team visit for ${new Date(createdAt.getTime() + 86400000 * 2).toLocaleDateString()}.`,
            isInternal: true,
            createdAt: new Date(createdAt.getTime() + 7200000),
          },
        });
      }

      if (status === "RESOLVED" || status === "CLOSED") {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: randomItem(managers).id,
            body: "This issue has been resolved. Please let us know if you experience any further problems.",
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 86400000 * 3),
          },
        });
      }
    }
  }

  // ── Announcements ──
  console.log("Creating 10 announcements...");
  for (let i = 0; i < ANNOUNCEMENTS.length; i++) {
    const a = ANNOUNCEMENTS[i];
    const sentAt = daysAgo(i * 18 + randomInt(0, 10)); // spread over ~6 months

    const announcement = await prisma.announcement.create({
      data: {
        authorId: randomItem(managers).id,
        title: a.title,
        bodyHtml: a.body,
        audience: a.audience,
        zoneFilter: "zone" in a ? a.zone : null,
        sentAt,
      },
    });

    // Create notification logs for relevant owners
    const targetOwners = a.audience === "ALL"
      ? allOwnerUsers
      : a.audience === "ZONE" && "zone" in a
        ? allOwnerUsers.filter((_, idx) => allUnits[idx]?.zone === a.zone)
        : allOwnerUsers.slice(0, 5);

    // Deduplicate by user id
    const seen = new Set<string>();
    for (const owner of targetOwners) {
      if (seen.has(owner.id)) continue;
      seen.add(owner.id);
      const readChance = Math.random();
      await prisma.notificationLog.create({
        data: {
          announcementId: announcement.id,
          userId: owner.id,
          sentAt,
          readAt: readChance < 0.6 ? new Date(sentAt.getTime() + randomInt(3600000, 86400000 * 3)) : null,
        },
      }).catch(() => null); // skip unique constraint violations
    }
  }

  // ── Renovation Applications ──
  console.log("Creating 8 renovation applications...");
  const renovationScopes = [
    { scope: "Interior Renovation", desc: "Complete kitchen remodel with new countertops, cabinets, and appliances", contractor: "Al Futtaim Interiors" },
    { scope: "Exterior Modification", desc: "Extension of outdoor terrace with pergola and seating area", contractor: "Gulf Contracting LLC" },
    { scope: "Plumbing", desc: "Replace all bathroom fixtures and upgrade water heater system", contractor: "RAK Plumbing Services" },
    { scope: "Electrical", desc: "Install solar panels on rooftop and upgrade electrical panel", contractor: "SunPower UAE" },
    { scope: "Interior Renovation", desc: "Master bedroom and ensuite bathroom renovation", contractor: "Design House Dubai" },
    { scope: "Structural", desc: "Add a mezzanine level in the double-height living room", contractor: "Structural Solutions ME" },
    { scope: "Exterior Modification", desc: "Install private swimming pool in backyard area", contractor: "AquaBuild" },
    { scope: "Interior Renovation", desc: "Convert ground floor storage into home office with AC", contractor: null },
  ];

  const renovationStatuses: Array<{ status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"; comment?: string }> = [
    { status: "PENDING" },
    { status: "UNDER_REVIEW" },
    { status: "APPROVED" },
    { status: "APPROVED" },
    { status: "REJECTED", comment: "The proposed structural changes exceed the allowable modification limits for this zone. Please consult with our architectural review committee." },
    { status: "CHANGES_REQUESTED", comment: "Please provide updated floor plans showing the electrical routing and confirm the contractor's DEWA certification." },
    { status: "PENDING" },
    { status: "UNDER_REVIEW" },
  ];

  for (let i = 0; i < 8; i++) {
    const unit = allUnits[i * 20 + randomInt(0, 15)];
    const r = renovationScopes[i];
    const s = renovationStatuses[i];
    const createdAt = daysAgo(randomInt(10, 90));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomInt(14, 60));

    await prisma.renovationApplication.create({
      data: {
        unitId: unit.id,
        scope: r.scope,
        description: r.desc,
        contractorName: r.contractor,
        startDate,
        endDate: new Date(startDate.getTime() + 86400000 * randomInt(30, 90)),
        status: s.status,
        managerComment: s.comment ?? null,
        approvedBy: s.status === "APPROVED" ? randomItem(managers).id : null,
        approvedAt: s.status === "APPROVED" ? daysAgo(randomInt(1, 30)) : null,
        createdAt,
      },
    });
  }

  // ── Violations ──
  console.log("Creating 5 violations...");
  const violations = [
    { rule: "Noise After Hours", desc: "Loud music and party noise reported after 11 PM on multiple occasions by neighboring units.", fine: 1000 },
    { rule: "Unauthorized Modifications", desc: "External wall painted a different color without prior management approval.", fine: 2500 },
    { rule: "Pet Policy Violation", desc: "Unleashed dog in the common area playground, causing distress to children.", fine: 500 },
    { rule: "Parking Violation", desc: "Vehicle consistently parked in fire lane near zone entrance, blocking emergency access.", fine: 750 },
    { rule: "Waste Disposal Violation", desc: "Construction debris dumped in community bin area instead of arranged special collection.", fine: 1500 },
  ];

  const violationStatuses: Array<"OPEN" | "RESOLVED"> = ["OPEN", "OPEN", "OPEN", "RESOLVED", "RESOLVED"];

  for (let i = 0; i < 5; i++) {
    const unit = allUnits[randomInt(0, allUnits.length - 1)];
    const v = violations[i];
    const createdAt = daysAgo(randomInt(5, 120));

    await prisma.violation.create({
      data: {
        unitId: unit.id,
        issuedById: randomItem(managers).id,
        ruleBreached: v.rule,
        description: v.desc,
        fineAmountAed: v.fine,
        status: violationStatuses[i],
        resolvedAt: violationStatuses[i] === "RESOLVED" ? daysAgo(randomInt(1, 30)) : null,
        createdAt,
      },
    });
  }

  // ── Audit logs for compliance actions ──
  console.log("Creating audit log entries...");
  await prisma.auditLog.create({
    data: { action: "RENOVATION_APPROVED", entityType: "RenovationApplication", entityId: "seed", userId: mgr1.id, metadata: { note: "Seed data" } },
  });
  await prisma.auditLog.create({
    data: { action: "VIOLATION_CREATED", entityType: "Violation", entityId: "seed", userId: mgr2.id, metadata: { note: "Seed data" } },
  });

  console.log("\n✅ Seed complete!");
  console.log(`   ${allUnits.length} units across 3 zones`);
  console.log(`   ${allOwnerUsers.length + 3} users (1 admin, 2 managers, ${allOwnerUsers.length} owners)`);
  console.log(`   ${allUnits.length * 8} invoices (2024-2025)`);
  console.log(`   40 tickets with comments`);
  console.log(`   10 announcements with notifications`);
  console.log(`   8 renovation applications`);
  console.log(`   5 violations`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
