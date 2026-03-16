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

function setMetaByProperty(property, content) {
  const node = ensureMeta(`meta[property=\"${property}\"]`, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    return meta;
  });
  node.setAttribute("content", content || "");
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
  let imageUrl = "";
  let ogType = "website";

  if (route.section === "detail" && entry) {
    title = `${entry.title} | ${siteName}`;
    description = entry.summary || stripHtml(entry.contentHtml).slice(0, 180) || siteDesc;
    imageUrl = entry.image ? new URL(entry.image, window.location.origin).toString() : "";
    ogType = "article";
  }

  document.title = title;
  setCanonical(absoluteUrl);

  setMetaByName("description", description);
  setMetaByName("twitter:card", imageUrl ? "summary_large_image" : "summary");
  setMetaByName("twitter:title", title);
  setMetaByName("twitter:description", description);
  setMetaByName("twitter:image", imageUrl);

  setMetaByProperty("og:type", ogType);
  setMetaByProperty("og:title", title);
  setMetaByProperty("og:description", description);
  setMetaByProperty("og:url", absoluteUrl);
  setMetaByProperty("og:image", imageUrl);
  setMetaByProperty("og:site_name", siteName);
}
