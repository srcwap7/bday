export const API_BASE = "https://tonsorial-preppily-jamika.ngrok-free.dev";
 
// Every fetch in the app should use this helper so the ngrok bypass header
// is always present (without it ngrok shows an interstitial page and the
// browser gets HTML back instead of JSON, which looks like a CORS error).
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",           // always send the sessionId cookie
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",   // bypasses ngrok interstitial
      ...(options.headers ?? {}),
    },
  });
  return res;
}
 