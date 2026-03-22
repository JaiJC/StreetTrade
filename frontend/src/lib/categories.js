export const CATEGORIES = [
  { emoji: "☕", label: "Coffee & Cafes", query: "cafe", key: "coffee" },
  { emoji: "🍜", label: "Restaurants", query: "restaurant", key: "restaurants" },
  { emoji: "🛒", label: "Grocery & Markets", query: "grocery", key: "grocery" },
  { emoji: "💇", label: "Salons & Barbers", query: "barbershop", key: "salons" },
  { emoji: "👗", label: "Clothing & Boutiques", query: "clothing", key: "clothing" },
  { emoji: "🏥", label: "Health & Wellness", query: "health", key: "health" },
  { emoji: "🔧", label: "Auto & Repair", query: "auto repair", key: "auto" },
  { emoji: "🌿", label: "Specialty & Unique", query: "specialty", key: "specialty" },
];

export function categoryEmoji(category) {
  const normalized = (category || "").toLowerCase();
  if (normalized.includes("restaurant") || normalized.includes("cafe")) return "🍜";
  if (normalized.includes("grocery") || normalized.includes("market")) return "🛒";
  if (
    normalized.includes("barber") ||
    normalized.includes("salon") ||
    normalized.includes("laundry") ||
    normalized.includes("services")
  ) {
    return "💇";
  }
  if (normalized.includes("retail") || normalized.includes("clothing") || normalized.includes("boutique")) {
    return "👗";
  }
  if (normalized.includes("health") || normalized.includes("pharmacy") || normalized.includes("clinic")) {
    return "🏥";
  }
  if (normalized.includes("auto")) return "🔧";
  return "🌿";
}

export function friendlySource(source) {
  const normalized = (source || "").toLowerCase();
  if (normalized === "streetview") return "Street View";
  if (normalized === "mapillary") return "Mapillary";
  if (normalized === "overture") return "Overture";
  if (normalized === "yelp") return "Yelp";
  if (normalized === "foursquare") return "Foursquare";
  return source || "Unknown";
}
