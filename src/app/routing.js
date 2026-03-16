export const ROUTE_SECTIONS = new Set(["home", "about", "contact", "posts-all", "games-all"]);

function cleanPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return `${trimmed}/`;
}

function parseLegacyHash(hash) {
  const clean = (hash || "").replace(/^#/, "").trim();
  if (!clean) return null;

  if (clean.startsWith("detail-")) {
    const parts = clean.split("-");
    const type = parts[1];
    const slug = parts.slice(2).join("-");
    if ((type === "post" || type === "game") && slug) {
      return { section: "detail", type, slug };
    }
    return { section: "home" };
  }

  if (ROUTE_SECTIONS.has(clean)) {
    return { section: clean };
  }

  return null;
}

function parsePath(pathname) {
  const path = cleanPath(pathname);

  if (path === "/") return { section: "home" };
  if (path === "/about/") return { section: "about" };
  if (path === "/contact/") return { section: "contact" };
  if (path === "/posts/") return { section: "posts-all" };
  if (path === "/games/") return { section: "games-all" };

  const postMatch = path.match(/^\/posts\/([a-z0-9-]+)\/$/);
  if (postMatch) return { section: "detail", type: "post", slug: postMatch[1] };

  const gameMatch = path.match(/^\/games\/([a-z0-9-]+)\/$/);
  if (gameMatch) return { section: "detail", type: "game", slug: gameMatch[1] };

  return null;
}

export function parseLocationRoute(locationLike = window.location) {
  const hashRoute = parseLegacyHash(locationLike.hash);
  const pathRoute = parsePath(locationLike.pathname);

  if (hashRoute && hashRoute.section === "detail") {
    return { ...hashRoute, fromLegacyHash: true };
  }

  if (pathRoute) return pathRoute;

  if (hashRoute) {
    return { ...hashRoute, fromLegacyHash: true };
  }

  return { section: "home" };
}

export function routeToPath(route) {
  if (route.section === "detail") {
    if (route.type === "post") return `/posts/${route.slug}/`;
    if (route.type === "game") return `/games/${route.slug}/`;
    return "/";
  }

  switch (route.section) {
    case "home":
      return "/";
    case "about":
      return "/about/";
    case "contact":
      return "/contact/";
    case "posts-all":
      return "/posts/";
    case "games-all":
      return "/games/";
    default:
      return "/";
  }
}

export function normalizeRoute(route) {
  if (!route || typeof route !== "object") return { section: "home" };

  if (route.section === "detail") {
    if ((route.type === "post" || route.type === "game") && route.slug) {
      return { section: "detail", type: route.type, slug: route.slug };
    }
    return { section: "home" };
  }

  if (ROUTE_SECTIONS.has(route.section)) {
    return { section: route.section };
  }

  return { section: "home" };
}
