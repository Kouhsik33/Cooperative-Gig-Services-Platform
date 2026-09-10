// The service catalog, in one place.
//
// Shared by the seed and the backfill script so the two cannot describe
// the catalog differently — the detail content below is what a customer
// reads on the service page.
//
// Base prices represent the realistic "starting from" price of the smallest
// problem/task item for that service.

export const serviceDefs = [
  {
    name: "Electrical Repair",
    category: "electrician",
    basePrice: 69,
    description:
      "Switchboard, socket, wiring and fixture repairs by a certified cooperative electrician.",
    durationMinMinutes: 15,
    durationMaxMinutes: 75,
    inclusions: [
      "Fault diagnosis and safety check",
      "Switch, socket and regulator repair",
      "Minor wiring correction",
      "Post-repair load test",
    ],
    exclusions: ["Replacement parts and fittings", "Full house rewiring", "Meter or DB board replacement"],
  },
  {
    name: "Plumbing Repair",
    category: "plumber",
    basePrice: 89,
    description:
      "Leak, blockage and fitting repairs for taps, flush tanks, pipes and bathroom fixtures.",
    durationMinMinutes: 15,
    durationMaxMinutes: 60,
    inclusions: [
      "Leak detection and sealing",
      "Tap, mixer and jet spray repair",
      "Drain and waste unclogging",
      "Fitting tightening and testing",
    ],
    exclusions: ["Pipes, taps and sanitaryware", "Concealed pipe chasing", "Overhead tank replacement"],
  },
  {
    name: "Elderly Care Visit",
    category: "caregiver",
    basePrice: 99,
    description:
      "A trained caregiver visits to assist with vitals check, routine, mobility and medication reminders.",
    durationMinMinutes: 25,
    durationMaxMinutes: 75,
    inclusions: [
      "Vitals check and medication schedule log",
      "Mobility and daily-routine assistance",
      "Companionship and wellness care",
      "Light meal & hydration support",
    ],
    exclusions: ["Clinical or nursing procedures", "Overnight stay", "Prescription medicines"],
  },
  {
    name: "Home Deep Cleaning",
    category: "cleaner",
    basePrice: 99,
    description: "Itemized cleaning for bathrooms, kitchen counters, fans, balconies, and floors.",
    durationMinMinutes: 25,
    durationMaxMinutes: 80,
    inclusions: [
      "Tile scrubbing and hard water descaling",
      "Kitchen surface and sink degreasing",
      "Ceiling fan and blind dusting",
      "Balcony wash and machine floor scrub",
    ],
    exclusions: ["Exterior window facades", "Furniture shifting", "Pest control"],
  },
  {
    name: "Local Driver (per trip)",
    category: "driver",
    basePrice: 129,
    description: "A verified cooperative driver for your vehicle, for local errands, transit, or day trips.",
    durationMinMinutes: 30,
    durationMaxMinutes: 180,
    inclusions: ["Verified, licence-checked driver", "Local city driving & errands", "Careful vehicle handling"],
    exclusions: ["Fuel, tolls and parking", "Outstation travel", "Vehicle provided by us"],
  },
  {
    name: "Gardening & Lawn Care",
    category: "gardener",
    basePrice: 79,
    description: "Potted plant care, lawn mowing, hedge trimming, weeding, and garden clean-up.",
    durationMinMinutes: 20,
    durationMaxMinutes: 70,
    inclusions: ["Pot repotting & nutrients", "Plant pruning and hedge shaping", "Weeding & bed clearing", "Green-waste sweeping"],
    exclusions: ["Plants, soil and fertiliser", "Tree felling", "Landscaping design"],
  },
  {
    name: "Appliance Repair",
    category: "technician",
    basePrice: 129,
    description:
      "Diagnosis and repair of washing machines, refrigerators, microwaves, mixers, and geysers.",
    durationMinMinutes: 20,
    durationMaxMinutes: 60,
    inclusions: ["Fault diagnosis", "Mechanical and electrical repair", "Performance test after repair"],
    exclusions: ["Spare parts", "Gas refilling", "Appliances still under manufacturer warranty"],
  },
  {
    name: "AC Servicing",
    category: "technician",
    basePrice: 149,
    description:
      "Targeted service of split or window ACs — filter cleaning, leak fix, deep foam wash, and diagnostics.",
    durationMinMinutes: 20,
    durationMaxMinutes: 60,
    inclusions: [
      "Filter and grill jet wash",
      "Drain line clearing & leak fix",
      "Cooling coil foam service",
      "Gas pressure inspection",
    ],
    exclusions: ["Gas refilling", "Compressor or PCB replacement", "Installation or uninstallation"],
  },
];
