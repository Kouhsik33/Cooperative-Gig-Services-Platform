// Seed script — implements the plan in Part I of the spec:
//   1 Federation, 2-3 Societies, 15-20 Workers, 8-10 Services,
//   60-90 days synthetic booking history, 2-3 demo customers,
//   a handful of pre-completed bookings with ratings + welfare
//   transactions so Worker's Earnings/Welfare tabs aren't empty.
//
// Demo pilot federation: Pune, Maharashtra (matches the mr.json
// regional language already scaffolded in mobile-app/src/i18n).

import { PrismaClient, Role, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeWageSplit } from "../src/services/wageSplit";
import { serviceDefs } from "./data/services";
import { packageDefs } from "./data/packages";

const prisma = new PrismaClient();

const PUNE_CENTER = { lat: 18.5204, lng: 73.8567 };
const HISTORY_DAYS = 60;

function jitter(base: number, spreadDeg: number): number {
  return base + (Math.random() - 0.5) * spreadDeg * 2;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const federation = await prisma.federation.create({
    data: { name: "Pune Cooperative Workers Federation", region: "Maharashtra" },
  });

  const welfareFund = await prisma.welfareFund.create({
    data: { federationId: federation.id, balance: 0 },
  });

  const societyDefs = [
    { name: "Kothrud Workers Society", pincode: "411038" },
    { name: "Hadapsar Workers Society", pincode: "411028" },
    { name: "Wakad Workers Society", pincode: "411057" },
  ];
  const societies = [];
  for (const s of societyDefs) {
    societies.push(
      await prisma.society.create({
        data: { name: s.name, federationId: federation.id, pincode: s.pincode },
      })
    );
  }

  await prisma.user.create({
    data: {
      name: "Federation Admin",
      phone: "9000000001",
      role: Role.FEDERATION_ADMIN,
      passwordHash,
      federationId: federation.id,
    },
  });

  const services = [];
  for (const s of serviceDefs) {
    const created = await prisma.service.create({ data: s });
    services.push(created);
    for (const def of packageDefs[s.name] ?? []) {
      await prisma.servicePackage.create({
        data: { serviceId: created.id, ...def, isDefault: def.isDefault ?? false },
      });
    }
  }

  const workerNames = [
    "Ramesh Patil", "Sunita Kadam", "Vijay Shinde", "Anita More", "Suresh Jadhav",
    "Kavita Pawar", "Mahesh Deshmukh", "Pooja Gaikwad", "Sanjay Bhosale", "Meena Chavan",
    "Ganesh Kale", "Sarika Salunkhe", "Prakash Waghmare", "Rekha Thorat", "Dilip Mane",
    "Shobha Kulkarni",
  ];
  const skills = [
    "electrician", "plumber", "caregiver", "cleaner", "driver", "gardener", "technician",
  ];

  const workers = [];
  for (let i = 0; i < workerNames.length; i++) {
    const name = workerNames[i];
    const primarySkill = skills[i % skills.length];
    // Must differ from the primary — pick() could otherwise return the
    // same skill, producing a worker with {technician, technician}.
    const otherSkills = skills.filter((s) => s !== primarySkill);
    const secondarySkill = Math.random() < 0.3 ? pick(otherSkills) : undefined;
    const society = societies[i % societies.length];

    // Phone numbering: index 0 is the primary demo electrician
    // (9000000100 — kept exactly, referenced throughout the app/docs).
    // Everyone else in this general round-robin pool moves to a
    // 90000005XX range so it never collides with the dedicated,
    // single-skill dispatch-testing workers seeded further below
    // (9000000101-103 / 111-113 / 121-123).
    const phone = i === 0 ? "9000000100" : `90000005${String(i).padStart(2, "0")}`;
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        role: Role.WORKER,
        passwordHash,
        language: i % 7 === 0 ? "mr" : i % 5 === 0 ? "hi" : "en",
      },
    });

    // Mostly VERIFIED, with a few in earlier pipeline stages to demo the
    // federation admin's verification queue (Requirement 1).
    let verificationStatus: VerificationStatus = VerificationStatus.VERIFIED;
    if (i === workerNames.length - 1) verificationStatus = VerificationStatus.SUBMITTED;
    else if (i === workerNames.length - 2) verificationStatus = VerificationStatus.SUBMITTED;
    else if (i === workerNames.length - 3) verificationStatus = VerificationStatus.UNDER_REVIEW;
    else if (i === workerNames.length - 4) verificationStatus = VerificationStatus.REJECTED;

    const worker = await prisma.worker.create({
      data: {
        userId: user.id,
        societyId: society.id,
        skills: secondarySkill ? [primarySkill, secondarySkill] : [primarySkill],
        certifications: [`${primarySkill}-certified-level-1`],
        verificationStatus,
        latitude: jitter(PUNE_CENTER.lat, 0.05),
        longitude: jitter(PUNE_CENTER.lng, 0.05),
      },
    });
    workers.push(worker);
  }

  // Dedicated dispatch-testing demo workers (SIH26089 dispatch model
  // update §6/§7/§23/§33) — deterministic phone numbers, single-skill
  // specialization, all VERIFIED + AVAILABLE, and all clustered in the
  // same society/pincode (Kothrud, 411038 — the same pincode as the
  // primary demo customer's seeded "Home" address below) specifically so
  // "multiple eligible workers for the same service in the same area"
  // is real, testable data rather than a coincidence of round-robin
  // assignment.
  const kothrud = societies.find((s) => s.pincode === "411038")!;
  const dispatchWorkerDefs = [
    { phone: "9000000101", name: "Vikram Rao", skills: ["electrician", "fan-repair", "switch-repair", "wiring", "installation"] },
    { phone: "9000000102", name: "Arjun Nair", skills: ["electrician", "fan-repair", "switch-repair", "wiring", "installation"] },
    { phone: "9000000103", name: "Farhan Sheikh", skills: ["electrician", "fan-repair", "switch-repair", "wiring", "installation"] },
    { phone: "9000000111", name: "Irfan Qureshi", skills: ["plumber", "pipe-repair", "leakage", "tap-installation", "bathroom-plumbing", "water-connection"] },
    { phone: "9000000112", name: "Rajesh Yadav", skills: ["plumber", "pipe-repair", "leakage", "tap-installation", "bathroom-plumbing", "water-connection"] },
    { phone: "9000000113", name: "Naveen Reddy", skills: ["plumber", "pipe-repair", "leakage", "tap-installation", "bathroom-plumbing", "water-connection"] },
    { phone: "9000000121", name: "Deepak Sharma", skills: ["technician", "ac-repair", "ac-service", "ac-installation", "cooling-issue", "gas-refill"] },
    { phone: "9000000122", name: "Manoj Verma", skills: ["technician", "ac-repair", "ac-service", "ac-installation", "cooling-issue", "gas-refill"] },
    { phone: "9000000123", name: "Ashok Iyer", skills: ["technician", "ac-repair", "ac-service", "ac-installation", "cooling-issue", "gas-refill"] },
  ];
  for (const def of dispatchWorkerDefs) {
    const user = await prisma.user.create({
      data: { name: def.name, phone: def.phone, role: Role.WORKER, passwordHash, language: "en" },
    });
    const worker = await prisma.worker.create({
      data: {
        userId: user.id,
        societyId: kothrud.id,
        skills: def.skills,
        certifications: [`${def.skills[0]}-certified-level-1`],
        verificationStatus: VerificationStatus.VERIFIED,
        availability: "AVAILABLE",
        latitude: jitter(PUNE_CENTER.lat, 0.02),
        longitude: jitter(PUNE_CENTER.lng, 0.02),
      },
    });
    workers.push(worker);
  }

  const customerDefs = [
    { name: "Aarav Mehta", phone: "9000000201" },
    { name: "Priya Nair", phone: "9000000202" },
    { name: "Rohan Kulkarni", phone: "9000000203" },
  ];
  const customers = [];
  for (const c of customerDefs) {
    customers.push(
      await prisma.user.create({
        data: { name: c.name, phone: c.phone, role: Role.CUSTOMER, passwordHash },
      })
    );
  }

  const verifiedWorkers = workers.filter(
    (w) => w.verificationStatus === VerificationStatus.VERIFIED
  );
  const societyPincodeById = new Map(societies.map((s) => [s.id, s.pincode]));

  // A couple of saved addresses for the primary demo customer (product-flow
  // update §6/§54) — enough to exercise "saved addresses" in the booking
  // flow without needing every seeded customer to have them.
  await prisma.customerAddress.createMany({
    data: [
      {
        customerId: customers[0].id,
        label: "Home",
        line1: "Flat 302, Green Residency",
        line2: "Kothrud",
        pincode: "411038",
        latitude: jitter(PUNE_CENTER.lat, 0.02),
        longitude: jitter(PUNE_CENTER.lng, 0.02),
        contactName: customers[0].name,
        contactPhone: customers[0].phone,
        isDefault: true,
      },
      {
        customerId: customers[0].id,
        label: "Work",
        line1: "2nd Floor, ABC Business Complex",
        line2: "Hadapsar",
        pincode: "411028",
        latitude: jitter(PUNE_CENTER.lat, 0.02),
        longitude: jitter(PUNE_CENTER.lng, 0.02),
        contactName: customers[0].name,
        contactPhone: customers[0].phone,
        isDefault: false,
      },
    ],
  });

  // 60 days of synthetic completed booking history — feeds AI demand
  // forecasting (Part H) and populates Worker Earnings/Welfare tabs on
  // first login (Part I).
  const now = new Date();

  for (let dayOffset = HISTORY_DAYS; dayOffset >= 1; dayOffset--) {
    const bookingsToday = randomInt(1, 4);
    for (let b = 0; b < bookingsToday; b++) {
      const service = pick(services);
      const eligibleWorkers = verifiedWorkers.filter((w) =>
        w.skills.includes(service.category)
      );
      const worker = eligibleWorkers.length > 0 ? pick(eligibleWorkers) : pick(verifiedWorkers);
      const customer = pick(customers);
      const isEmergency = Math.random() < 0.1;
      const split = computeWageSplit(service.basePrice, isEmergency);

      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() - dayOffset);
      scheduledAt.setHours(randomInt(8, 19), randomInt(0, 59), 0, 0);

      const booking = await prisma.booking.create({
        data: {
          customerId: customer.id,
          workerId: worker.id,
          serviceId: service.id,
          status: "COMPLETED",
          isEmergency,
          scheduledAt,
          latitude: jitter(PUNE_CENTER.lat, 0.05),
          longitude: jitter(PUNE_CENTER.lng, 0.05),
          servicePincode: societyPincodeById.get(worker.societyId) ?? null,
          totalAmount: split.totalAmount,
          workerShare: split.workerShare,
          federationFee: split.federationFee,
          welfareContribution: split.welfareContribution,
          emergencyBonus: split.emergencyBonus,
          createdAt: scheduledAt,
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          razorpayId: `mock_${booking.id.slice(0, 8)}`,
          status: "paid",
          paidAt: scheduledAt,
        },
      });

      if (Math.random() < 0.8) {
        await prisma.rating.create({
          data: {
            bookingId: booking.id,
            stars: randomInt(3, 5),
            comment: pick([
              "Great work, very professional.",
              "On time and courteous.",
              "Good service overall.",
              null,
              null,
            ]),
          },
        });
      }

      await prisma.welfareFundTransaction.create({
        data: {
          welfareFundId: welfareFund.id,
          workerId: worker.id,
          bookingId: booking.id,
          amount: split.welfareContribution,
          type: "contribution",
          createdAt: scheduledAt,
        },
      });
      await prisma.welfareFund.update({
        where: { id: welfareFund.id },
        data: { balance: { increment: split.welfareContribution } },
      });
    }
  }

  // Recompute each worker's aggregate rating from seeded history.
  for (const worker of workers) {
    const ratings = await prisma.rating.findMany({
      where: { booking: { workerId: worker.id } },
    });
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
      await prisma.worker.update({
        where: { id: worker.id },
        data: { ratingAvg: Math.round(avg * 100) / 100 },
      });
    }
  }

  // A few live, in-flight bookings for the admin dashboard's "live booking
  // oversight" and to give the worker Job Feed non-empty content — spread
  // across the extended lifecycle (product-flow update §28) so the new
  // ON_THE_WAY/ARRIVED/COMPLETION_PENDING states aren't only reachable by
  // actually running the app end to end.
  const liveStatuses = [
    "REQUESTED",
    "ACCEPTED",
    "ON_THE_WAY",
    "ARRIVED",
    "IN_PROGRESS",
    "COMPLETION_PENDING",
  ] as const;
  for (let i = 0; i < 6; i++) {
    const service = pick(services);
    const eligibleWorkers = verifiedWorkers.filter((w) =>
      w.skills.includes(service.category)
    );
    const worker = eligibleWorkers.length > 0 ? pick(eligibleWorkers) : pick(verifiedWorkers);
    const customer = pick(customers);
    const isEmergency = i === 0;
    const split = computeWageSplit(service.basePrice, isEmergency);

    const scheduledAt = new Date(now);
    scheduledAt.setHours(scheduledAt.getHours() + randomInt(1, 48));

    await prisma.booking.create({
      data: {
        customerId: customer.id,
        workerId: worker.id,
        serviceId: service.id,
        status: liveStatuses[i],
        isEmergency,
        scheduledAt,
        latitude: jitter(PUNE_CENTER.lat, 0.05),
        longitude: jitter(PUNE_CENTER.lng, 0.05),
        servicePincode: societyPincodeById.get(worker.societyId) ?? null,
        contactName: customer.name,
        contactPhone: customer.phone,
        totalAmount: split.totalAmount,
        workerShare: split.workerShare,
        federationFee: split.federationFee,
        welfareContribution: split.welfareContribution,
        emergencyBonus: split.emergencyBonus,
      },
    });
  }

  // A second, minimal federation + admin — not part of Part I's seed plan,
  // added purely so federation-scoping (an admin can only ever touch their
  // own federation's data) can actually be exercised in testing rather than
  // just assumed from code review.
  const otherFederation = await prisma.federation.create({
    data: { name: "Nashik Cooperative Workers Federation", region: "Maharashtra" },
  });
  await prisma.welfareFund.create({
    data: { federationId: otherFederation.id, balance: 0 },
  });
  await prisma.user.create({
    data: {
      name: "Other Federation Admin",
      phone: "9000000002",
      role: Role.FEDERATION_ADMIN,
      passwordHash,
      federationId: otherFederation.id,
    },
  });

  console.log(
    `Seeded: 1 federation, ${societies.length} societies, ${workers.length} workers, ` +
      `${services.length} services, ${customers.length} customers, ${HISTORY_DAYS} days of booking history.`
  );
  console.log(`admin-web login (phone+password, unchanged): password123`);
  console.log(`Federation admin phone: 9000000001`);
  console.log(`Other-federation admin phone (for scoping tests): 9000000002`);
  console.log(`Mobile app login is passwordless (OTP) — demo phone 9000000201 always gets OTP 0000.`);
  console.log(`Demo customer phone: 9000000201 (has saved Home/Work addresses)`);
  console.log(`Demo worker phone: 9000000100`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
