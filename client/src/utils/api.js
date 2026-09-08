/**
 * Centralized API configuration for QuickAI client.
 * Prioritizes VITE_BACKEND_URL and VITE_BASE_URL from environment.
 * Falls back to http://localhost:5000 in dev mode, or relative path in production.
 */
export const getBackendUrl = () => {
  const envUrl =
    import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BASE_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // In development, default to local Express backend on port 5000
  // In production, default to relative origin (safe for reverse proxies and custom domains)
  return import.meta.env.DEV ? "http://localhost:5000" : "";
};

export const backendUrl = getBackendUrl();
export default backendUrl;
