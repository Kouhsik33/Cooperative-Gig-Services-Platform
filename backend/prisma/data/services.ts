// The service catalog, in one place.
//
// Shared by the seed and the backfill script so the two cannot describe
// the catalog differently — the detail content below is what a customer
// reads on the service page, and it having drifted between "what we seed"
// and "what we ship" would be invisible until someone noticed a service
// promising something it doesn't do.

// Service-detail content (master prompt §12) — what's included, what
// isn't, and how long it takes. Written per service rather than
// generated, because a vague inclusion list is exactly the kind of
// filler that makes a detail page worthless.
export const serviceDefs = [
  {
    name: "Electrical Repair",
    category: "electrician",
    basePrice: 500,
    description:
      "Switchboard, wiring and fixture faults diagnosed and repaired by a certified cooperative electrician.",
    durationMinMinutes: 45,
    durationMaxMinutes: 90,
    inclusions: [
      "Fault diagnosis and safety check",
      "Switch, socket and fixture repair",
      "Minor wiring correction",
      "Post-repair load test",
    ],
    exclusions: ["Replacement parts and fittings", "Full house rewiring", "Meter or DB board replacement"],
  },
  {
    name: "Plumbing Repair",
    category: "plumber",
    basePrice: 450,
    description:
      "Leak, blockage and fitting repairs for taps, pipes and bathroom fixtures.",
    durationMinMinutes: 45,
    durationMaxMinutes: 90,
    inclusions: [
      "Leak detection and sealing",
      "Tap, mixer and shower repair",
      "Basic drain unblocking",
      "Fitting tightening and testing",
    ],
    exclusions: ["Pipes, taps and sanitaryware", "Concealed pipe chasing", "Overhead tank replacement"],
  },
  {
    name: "Elderly Care Visit",
    category: "caregiver",
    basePrice: 600,
    description:
      "A trained caregiver visits to assist with daily routine, mobility and medication reminders.",
    durationMinMinutes: 120,
    durationMaxMinutes: 180,
    inclusions: [
      "Companionship and wellbeing check",
      "Mobility and daily-routine assistance",
      "Medication reminders",
      "Light meal preparation",
    ],
    exclusions: ["Clinical or nursing procedures", "Overnight stay", "Prescription medicines"],
  },
  {
    name: "Home Deep Cleaning",
    category: "cleaner",
    basePrice: 400,
    description: "Room-by-room deep clean including floors, surfaces, fittings and bathrooms.",
    durationMinMinutes: 120,
    durationMaxMinutes: 240,
    inclusions: [
      "Floor scrubbing and mopping",
      "Bathroom descaling and sanitising",
      "Kitchen surface degreasing",
      "Dusting of fittings and fixtures",
    ],
    exclusions: ["Exterior window facades", "Furniture shifting", "Pest control"],
  },
  {
    name: "Local Driver (per trip)",
    category: "driver",
    basePrice: 350,
    description: "A verified driver for your own vehicle, for local trips within the city.",
    durationMinMinutes: 60,
    durationMaxMinutes: 180,
    inclusions: ["Verified, licence-checked driver", "Local city trip", "Careful vehicle handling"],
    exclusions: ["Fuel, tolls and parking", "Outstation travel", "Vehicle provided by us"],
  },
  {
    name: "Gardening & Lawn Care",
    category: "gardener",
    basePrice: 300,
    description: "Lawn trimming, plant care and garden tidying by an experienced gardener.",
    durationMinMinutes: 60,
    durationMaxMinutes: 120,
    inclusions: ["Lawn mowing and edging", "Plant pruning and shaping", "Weeding", "Green-waste clearing"],
    exclusions: ["Plants, soil and fertiliser", "Tree felling", "Landscaping design"],
  },
  {
    name: "Appliance Repair",
    category: "technician",
    basePrice: 550,
    description:
      "Diagnosis and repair of washing machines, refrigerators, microwaves and other home appliances.",
    durationMinMinutes: 45,
    durationMaxMinutes: 120,
    inclusions: ["Fault diagnosis", "Mechanical and electrical repair", "Performance test after repair"],
    exclusions: ["Spare parts", "Gas refilling", "Appliances still under manufacturer warranty"],
  },
  {
    name: "AC Servicing",
    category: "technician",
    basePrice: 650,
    description:
      "Full service of split or window air conditioners — cleaning, cooling check and basic troubleshooting.",
    durationMinMinutes: 60,
    durationMaxMinutes: 90,
    inclusions: [
      "Filter and coil cleaning",
      "Drain line clearing",
      "Cooling performance check",
      "Basic troubleshooting",
    ],
    exclusions: ["Gas refilling", "Compressor or PCB replacement", "Installation or uninstallation"],
  },
];
