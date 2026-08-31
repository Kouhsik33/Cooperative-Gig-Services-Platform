// GAP: no real device geolocation (expo-location) is wired into this
// Expo scaffold yet, so this fixed constant stands in for "the
// customer's current location" everywhere one is needed (emergency
// booking, the standard worker-search flow). Matches the seeded Pune
// demo city center used throughout backend testing. A real app needs
// actual GPS, not a hardcoded point.
export const DEMO_LOCATION = { latitude: 18.5204, longitude: 73.8567 };
