import { routeToPath } from "./routing.js";

export const DEFAULT_SITE_URL = "https://frinky.org";
export const DEFAULT_SITE_DESCRIPTION = "Frinky's portfolio of games, updates, and development posts.";
export const DEFAULT_IMAGE_PATH = "/images/frog.png";

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toAbsoluteUrl(baseUrl, input, fallback = "") {
  const value = String(input || fallback || "").trim();
  if (!value) return "";

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function routeHeadline(section, siteName) {
  switch (section) {
    case "about":
      return `About | ${siteName}`;
    case "contact":
      return `Contact | ${siteName}`;
    case "posts-all":
      return `Posts | ${siteName}`;
    case "games-all":
      return `Games | ${siteName}`;
    default:
      return siteName;
  }
}

function routeDescription(content, section) {
  const siteDescription = content?.site?.description || DEFAULT_SITE_DESCRIPTION;

  switch (section) {
    case "about":
      return stripHtml(content?.about?.contentHtml || "").slice(0, 180) || siteDescription;
    case "contact":
      return "Contact Finn Rawlings through email, X, Discord, GitHub, or YouTube.";
    case "posts-all":
      return "Posts, updates, and development notes from Frinky.";
    case "games-all":
      return "Games built and published by Frinky.";
    default:
      return content?.home?.summary || siteDescription;
  }
}

function routeImagePath(content, section) {
  if (section === "about") return content?.about?.image || DEFAULT_IMAGE_PATH;
  return content?.featured?.image || content?.about?.image || DEFAULT_IMAGE_PATH;
}

export function getRouteMeta({ route, entry = null, content = null } = {}) {
  const siteName = content?.site?.name || "Frinky";
  const siteDescription = content?.site?.description || DEFAULT_SITE_DESCRIPTION;
  const siteUrl =
    content?.site?.url ||
    (typeof window !== "undefined" && window.location?.origin) ||
    DEFAULT_SITE_URL;

  if (route?.section === "detail" && entry) {
    const image = toAbsoluteUrl(siteUrl, entry.image || DEFAULT_IMAGE_PATH, DEFAULT_IMAGE_PATH);
    return {
      siteName,
      title: `${entry.title || "Untitled"} | ${siteName}`,
      description: String(entry.summary || stripHtml(entry.contentHtml).slice(0, 180) || siteDescription),
      url: toAbsoluteUrl(siteUrl, routeToPath(route)),
      image,
      ogType: route.type === "post" ? "article" : "website",
      twitterCard: image ? "summary_large_image" : "summary",
    };
  }

  const image = toAbsoluteUrl(siteUrl, routeImagePath(content, route?.section), DEFAULT_IMAGE_PATH);
  return {
    siteName,
    title: routeHeadline(route?.section, siteName),
    description: routeDescription(content, route?.section),
    url: toAbsoluteUrl(siteUrl, routeToPath(route || { section: "home" })),
    image,
    ogType: "website",
    twitterCard: image ? "summary_large_image" : "summary",
  };
}
