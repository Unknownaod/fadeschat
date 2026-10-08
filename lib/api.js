export const API_BASE =
  process.env.NEXT_PUBLIC_FADES_API_URL || "https://api.fades.lol";

export async function api(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });

  let data = null;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) throw new Error(data?.error || "Something went wrong.");
  return data;
}
