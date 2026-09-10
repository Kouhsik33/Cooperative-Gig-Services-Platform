// Backfills service-detail content (description, duration, inclusions,
// exclusions, and basePrice) onto services that already exist, and replaces
// legacy monolithic packages with granular problem-based task options.
//
//   npx ts-node prisma/backfill-services.ts

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
        basePrice: def.basePrice,
        description: def.description,
        durationMinMinutes: def.durationMinMinutes,
        durationMaxMinutes: def.durationMaxMinutes,
        inclusions: def.inclusions,
        exclusions: def.exclusions,
      },
    });
    updated++;
  }

  // Packages / Task items are updated. Remove obsolete legacy tiers first.
  let packagesUpserted = 0;
  for (const [serviceName, defs] of Object.entries(packageDefs)) {
    const service = await prisma.service.findFirst({ where: { name: serviceName } });
    if (!service) {
      missing.push(`${serviceName} (packages)`);
      continue;
    }

    const currentNames = defs.map((d) => d.name);
    // Remove obsolete packages not in the new definition that have no bookings
    await prisma.servicePackage.deleteMany({
      where: {
        serviceId: service.id,
        name: { notIn: currentNames },
        bookings: { none: {} },
      },
    });

    for (const def of defs) {
      await prisma.servicePackage.upsert({
        where: { serviceId_name: { serviceId: service.id, name: def.name } },
        create: { serviceId: service.id, ...def, isDefault: def.isDefault ?? false },
        update: { ...def, isDefault: def.isDefault ?? false },
      });
      packagesUpserted++;
    }
  }

  console.log(`Backfilled ${updated} service(s), ${packagesUpserted} package(s)/task item(s).`);
  if (missing.length > 0) {
    console.warn(`Not found in database: ${missing.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
