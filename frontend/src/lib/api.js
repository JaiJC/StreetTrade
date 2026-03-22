const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function searchBusinesses({ query, lat, lng, radiusKm }) {
  const params = new URLSearchParams({
    query: query || "",
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radiusKm),
  });

  const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Search request failed");
  }
  return response.json();
}

export async function triggerDiscover(payload) {
  const response = await fetch(`${API_BASE_URL}/api/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to start discovery");
  }
  return response.json();
}

export async function fetchDiscoverStatus(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/discover/status/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch status");
  }
  return response.json();
}

export async function analyzeUpload(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/analyze-demo`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Analyze demo failed");
  }
  return response.json();
}
