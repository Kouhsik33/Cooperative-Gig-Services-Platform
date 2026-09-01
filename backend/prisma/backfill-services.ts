// Backfills service-detail content (description, duration, inclusions,
// exclusions) onto services that already exist.
//
// prisma/seed.ts is not idempotent — it creates rows unconditionally, so
// re-running it against a populated database duplicates every federation,
// worker and booking. This script exists so an existing demo database can
// pick up new catalog content without losing its booking history, which is
// what the AI forecast and the welfare ledger are built from.
//
//   npx ts-node prisma/backfill-services.ts
//
// Matches on name, updates content only, and never touches basePrice or
// category — those are referenced by existing bookings and by dispatch.

import { PrismaClient } from "@prisma/client";
import { serviceDefs } from "./data/services";
import { packageDefs } from "./data/packages";

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  let missing: string[] = [];

  for (const def of serviceDefs) {
    const existing = await prisma.service.findFirst({ where: { name: def.name } });
    if (!existing) {
      missing.push(def.name);
      continue;
    }
    await prisma.service.update({
      where: { id: existing.id },
      data: {
        description: def.description,
        durationMinMinutes: def.durationMinMinutes,
        durationMaxMinutes: def.durationMaxMinutes,
        inclusions: def.inclusions,
        exclusions: def.exclusions,
      },
    });
    updated++;
  }

  // Packages are upserted on (serviceId, name) so re-running is safe and
  // price/content edits propagate without orphaning any booking that
  // already references a package row.
  let packagesUpserted = 0;
  for (const [serviceName, defs] of Object.entries(packageDefs)) {
    const service = await prisma.service.findFirst({ where: { name: serviceName } });
    if (!service) {
      missing.push(`${serviceName} (packages)`);
      continue;
    }
    for (const def of defs) {
      await prisma.servicePackage.upsert({
        where: { serviceId_name: { serviceId: service.id, name: def.name } },
        create: { serviceId: service.id, ...def, isDefault: def.isDefault ?? false },
        update: { ...def, isDefault: def.isDefault ?? false },
      });
      packagesUpserted++;
    }
  }

  console.log(`Backfilled ${updated} service(s), ${packagesUpserted} package(s).`);
  if (missing.length > 0) {
    // Reported rather than created: a service present in the catalog file
    // but absent from the database means the database was seeded from a
    // different catalog, and silently inserting would hide that.
    console.warn(`Not found in database (run the seed instead): ${missing.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
