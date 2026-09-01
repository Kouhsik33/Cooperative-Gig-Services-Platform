// Service packages, keyed by service name.
//
// Lives beside services.ts for the same reason: the seed and the backfill
// script must describe the catalogue identically, and package *price* is
// what the wage split is computed from — a drift here would mean a customer
// paying one number while the worker is credited against another.
//
// Prices are set so each service's cheapest package equals that service's
// existing `basePrice`. That keeps `Service.basePrice` truthful as the
// "starting from" figure on the catalogue card, with no separate constant
// to keep in sync.

export interface PackageDef {
  name: string;
  tier: number;
  description: string;
  price: number;
  durationMinMinutes: number;
  durationMaxMinutes: number;
  inclusions: string[];
  isDefault?: boolean;
}

export const packageDefs: Record<string, PackageDef[]> = {
  "AC Servicing": [
    {
      name: "Basic",
      tier: 1,
      description: "Inspection and a basic clean to keep a working unit healthy.",
      price: 650,
      durationMinMinutes: 45,
      durationMaxMinutes: 60,
      inclusions: ["Filter cleaning", "Cooling performance check", "Basic troubleshooting"],
    },
    {
      name: "Standard",
      tier: 2,
      description: "Deep clean of filters and coils, plus a full drainage check.",
      price: 899,
      durationMinMinutes: 60,
      durationMaxMinutes: 90,
      inclusions: [
        "Everything in Basic",
        "Coil deep cleaning",
        "Drain line clearing",
        "Anti-bacterial treatment",
      ],
      isDefault: true,
    },
    {
      name: "Premium",
      tier: 3,
      description: "Full service including gas pressure check and outdoor unit cleaning.",
      price: 1299,
      durationMinMinutes: 90,
      durationMaxMinutes: 120,
      inclusions: [
        "Everything in Standard",
        "Gas pressure check",
        "Outdoor unit cleaning",
        "Electrical connection check",
      ],
    },
  ],
  "Electrical Repair": [
    {
      name: "Single Fault",
      tier: 1,
      description: "One switchboard, socket or fixture fault diagnosed and repaired.",
      price: 500,
      durationMinMinutes: 45,
      durationMaxMinutes: 60,
      inclusions: ["Fault diagnosis", "Single-point repair", "Safety check"],
      isDefault: true,
    },
    {
      name: "Multi-point",
      tier: 2,
      description: "Up to five points across the home, with a full safety inspection.",
      price: 899,
      durationMinMinutes: 60,
      durationMaxMinutes: 120,
      inclusions: [
        "Up to 5 repair points",
        "Full circuit safety inspection",
        "Earthing check",
        "Load test",
      ],
    },
  ],
  "Plumbing Repair": [
    {
      name: "Single Fix",
      tier: 1,
      description: "One leak, blockage or fitting repaired.",
      price: 450,
      durationMinMinutes: 45,
      durationMaxMinutes: 60,
      inclusions: ["Leak detection", "Single fixture repair", "Post-repair test"],
      isDefault: true,
    },
    {
      name: "Bathroom Package",
      tier: 2,
      description: "Full bathroom check with all taps, drains and fittings serviced.",
      price: 849,
      durationMinMinutes: 90,
      durationMaxMinutes: 120,
      inclusions: ["All taps and mixers serviced", "Drain unblocking", "Fitting replacement labour", "Water pressure check"],
    },
  ],
  "Home Deep Cleaning": [
    {
      name: "1 BHK",
      tier: 1,
      description: "Deep clean for a one-bedroom home.",
      price: 400,
      durationMinMinutes: 120,
      durationMaxMinutes: 180,
      inclusions: ["Floor scrubbing", "Bathroom sanitising", "Kitchen degreasing"],
      isDefault: true,
    },
    {
      name: "2 BHK",
      tier: 2,
      description: "Deep clean for a two-bedroom home, including balconies.",
      price: 749,
      durationMinMinutes: 180,
      durationMaxMinutes: 240,
      inclusions: ["Everything in 1 BHK", "Second bedroom", "Balcony cleaning", "Window interiors"],
    },
    {
      name: "3 BHK",
      tier: 3,
      description: "Full-home deep clean with all rooms, balconies and fittings.",
      price: 1099,
      durationMinMinutes: 240,
      durationMaxMinutes: 360,
      inclusions: ["Everything in 2 BHK", "Third bedroom", "Full fitting and fixture clean", "Cabinet exteriors"],
    },
  ],
  "Appliance Repair": [
    {
      name: "Diagnosis & Repair",
      tier: 1,
      description: "One appliance diagnosed and repaired where possible.",
      price: 550,
      durationMinMinutes: 45,
      durationMaxMinutes: 90,
      inclusions: ["Fault diagnosis", "Mechanical and electrical repair", "Performance test"],
      isDefault: true,
    },
    {
      name: "Full Service",
      tier: 2,
      description: "Repair plus a full internal service and preventive check.",
      price: 949,
      durationMinMinutes: 90,
      durationMaxMinutes: 120,
      inclusions: ["Everything in Diagnosis & Repair", "Internal cleaning", "Preventive wear check", "Calibration"],
    },
  ],
  "Elderly Care Visit": [
    {
      name: "Half Day",
      tier: 1,
      description: "A trained caregiver for a half-day visit.",
      price: 600,
      durationMinMinutes: 120,
      durationMaxMinutes: 180,
      inclusions: ["Companionship and wellbeing check", "Mobility assistance", "Medication reminders"],
      isDefault: true,
    },
    {
      name: "Full Day",
      tier: 2,
      description: "A full-day caregiver visit including meal preparation.",
      price: 1099,
      durationMinMinutes: 360,
      durationMaxMinutes: 480,
      inclusions: ["Everything in Half Day", "Meal preparation", "Light housekeeping", "Daily activity log"],
    },
  ],
  "Gardening & Lawn Care": [
    {
      name: "Basic Tidy",
      tier: 1,
      description: "Lawn mowing and a general garden tidy.",
      price: 300,
      durationMinMinutes: 60,
      durationMaxMinutes: 90,
      inclusions: ["Lawn mowing and edging", "Weeding", "Green-waste clearing"],
      isDefault: true,
    },
    {
      name: "Full Care",
      tier: 2,
      description: "Complete garden care including pruning and shaping.",
      price: 649,
      durationMinMinutes: 120,
      durationMaxMinutes: 180,
      inclusions: ["Everything in Basic Tidy", "Plant pruning and shaping", "Soil turning", "Seasonal plant care"],
    },
  ],
  "Local Driver (per trip)": [
    {
      name: "Short Trip",
      tier: 1,
      description: "A verified driver for a local trip, up to two hours.",
      price: 350,
      durationMinMinutes: 60,
      durationMaxMinutes: 120,
      inclusions: ["Verified, licence-checked driver", "Local city trip", "Careful vehicle handling"],
      isDefault: true,
    },
    {
      name: "Half Day",
      tier: 2,
      description: "A driver for the half day, for multiple stops.",
      price: 899,
      durationMinMinutes: 240,
      durationMaxMinutes: 300,
      inclusions: ["Everything in Short Trip", "Multiple stops", "Waiting time included"],
    },
  ],
};
