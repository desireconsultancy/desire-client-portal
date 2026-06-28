/**
 * Dynamic SEO & Security Enforcement for Secure Client Portal
 * Enforces strict 'noindex, nofollow' rules programmatically on the client-side.
 */
export function enforceSecurityMetaTags() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const head = document.head;

  // 1. Enforce Meta Robots
  const robotsMetaName = "robots";
  const robotsMetaValue = "noindex, nofollow, noarchive, nosnippet, noimageindex, nocache";
  
  let robotsMeta = document.querySelector(`meta[name="${robotsMetaName}"]`);
  if (!robotsMeta) {
    robotsMeta = document.createElement("meta");
    robotsMeta.setAttribute("name", robotsMetaName);
    head.appendChild(robotsMeta);
  }
  robotsMeta.setAttribute("content", robotsMetaValue);

  // 2. Enforce Cache Control (HTTP-equiv equivalents for caching prevention)
  const cacheControls = [
    { key: "cache-control", val: "no-cache, no-store, must-revalidate" },
    { key: "pragma", val: "no-cache" },
    { key: "expires", val: "0" }
  ];

  cacheControls.forEach(({ key, val }) => {
    let meta = document.querySelector(`meta[http-equiv="${key}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("http-equiv", key);
      head.appendChild(meta);
    }
    meta.setAttribute("content", val);
  });
}
