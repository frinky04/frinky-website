import { routeToPath } from "./routing.js";

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureMeta(selector, create) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = create();
    document.head.appendChild(node);
  }
  return node;
}

function setMetaByName(name, content) {
  const node = ensureMeta(`meta[name=\"${name}\"]`, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    return meta;
  });
  node.setAttribute("content", content || "");
}

function removeSocialMeta() {
  const selectors = [
    "meta[property^='og:']",
    "meta[name='twitter:card']",
    "meta[name='twitter:title']",
    "meta[name='twitter:description']",
    "meta[name='twitter:image']",
  ];

  selectors.forEach((selector) => {
    document.head.querySelectorAll(selector).forEach((node) => {
      node.remove();
    });
  });
}

function setCanonical(url) {
  const node = ensureMeta("link[rel=\"canonical\"]", () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    return link;
  });
  node.setAttribute("href", url);
}

function routeHeadline(section) {
  switch (section) {
    case "posts-all":
      return "Posts";
    case "games-all":
      return "Games";
    case "about":
      return "About";
    case "contact":
      return "Contact";
    default:
      return "Home";
  }
}

export function updateSeo({ route, entry, site }) {
  const siteName = site?.name || "Frinky";
  const siteDesc = site?.description || "Frinky's portfolio of games and posts.";

  const pathname = routeToPath(route);
  const absoluteUrl = new URL(pathname, window.location.origin).toString();

  let title = `${siteName} | ${routeHeadline(route.section)}`;
  let description = siteDesc;

  if (route.section === "detail" && entry) {
    title = `${entry.title} | ${siteName}`;
    description = entry.summary || stripHtml(entry.contentHtml).slice(0, 180) || siteDesc;
  }

  removeSocialMeta();
  document.title = title;
  setCanonical(absoluteUrl);
  setMetaByName("description", description);
}
