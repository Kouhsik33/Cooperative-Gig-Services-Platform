import { PrismaClient } from "@prisma/client";

// Idempotent demo setup for the live order-tracking demo. Does NOT
// re-run the full (non-idempotent) seed — it only pins deterministic
// coordinates on the two demo accounts so the simulated ~45s drive is
// always the same distance and always visible.
//
//   run:  npx ts-node prisma/demo-tracking-setup.ts
//
// Demo customer  9000000201  — service location fixed at Kothrud, Pune
// Demo worker    9000000121  — starts ~2.1 km NE (Deepak Sharma, AC/technician)
// Backup workers 9000000122 / 9000000123 — nearby, so a second run of the
//                demo can use a fresh worker.

const prisma = new PrismaClient();

const CUSTOMER_HOME = {
  label: "Home",
  line1: "Mayur Colony, Kothrud",
  line2: "Near Kothrud Bus Depot",
  landmark: "Opp. MIT College",
  pincode: "411038",
  latitude: 18.5074,
  longitude: 73.8077,
  contactName: "Aarav Mehta",
  contactPhone: "9000000201",
};

// ~2.1 km NE of CUSTOMER_HOME.
const WORKER_START = { latitude: 18.5236, longitude: 73.818 };
const WORKER_START_2 = { latitude: 18.5188, longitude: 73.8231 };
const WORKER_START_3 = { latitude: 18.5271, longitude: 73.8009 };

async function pinWorker(phone: string, coords: { latitude: number; longitude: number }) {
  const user = await prisma.user.findUnique({ where: { phone }, include: { worker: true } });
  if (!user?.worker) {
    console.warn(`  ! worker ${phone} not found — skipping`);
    return;
  }
  await prisma.worker.update({
    where: { id: user.worker.id },
    data: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      availability: "AVAILABLE",
      verificationStatus: "VERIFIED",
    },
  });
  console.log(`  worker ${phone} (${user.name}) -> ${coords.latitude}, ${coords.longitude}, AVAILABLE/VERIFIED`);
}

async function main() {
  const customer = await prisma.user.findUnique({ where: { phone: CUSTOMER_HOME.contactPhone } });
  if (!customer) throw new Error(`demo customer ${CUSTOMER_HOME.contactPhone} not found — run the seed first`);

  // One canonical "Home" address, default, at the fixed coordinates.
  const existing = await prisma.customerAddress.findFirst({
    where: { customerId: customer.id, label: "Home" },
  });
  if (existing) {
    await prisma.customerAddress.update({
      where: { id: existing.id },
      data: { ...CUSTOMER_HOME, isDefault: true, customerId: customer.id },
    });
  } else {
    await prisma.customerAddress.create({
      data: { ...CUSTOMER_HOME, isDefault: true, customerId: customer.id },
    });
  }
  // Make sure no other address outranks it.
  await prisma.customerAddress.updateMany({
    where: { customerId: customer.id, label: { not: "Home" } },
    data: { isDefault: false },
  });
  console.log(`  customer ${CUSTOMER_HOME.contactPhone} Home -> ${CUSTOMER_HOME.latitude}, ${CUSTOMER_HOME.longitude} (default)`);

  await pinWorker("9000000121", WORKER_START);
  await pinWorker("9000000122", WORKER_START_2);
  await pinWorker("9000000123", WORKER_START_3);

  // Clear any stale in-flight nav state on the demo accounts' bookings.
  await prisma.booking.updateMany({
    where: {
      customerId: customer.id,
      status: { in: ["ON_THE_WAY"] },
    },
    data: { navStartedAt: null, navFromLat: null, navFromLng: null },
  });

  console.log("\nDemo tracking setup complete.");
  console.log("  Customer: phone 9000000201, OTP 0000 (mobile app)");
  console.log("  Worker:   phone 9000000121, OTP 0000 (mobile app) — AC Servicing / Appliance Repair");
  console.log("  Straight-line distance ~2.1 km; simulated drive ~45 s.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
