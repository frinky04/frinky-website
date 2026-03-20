import { getRouteMeta } from "./route-meta.js";

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

export function updateSeo({ route, entry, content, site }) {
  const meta = getRouteMeta({
    route,
    entry,
    content: content || { site },
  });

  document.title = meta.title;
  setCanonical(meta.url);
  setMetaByName("description", meta.description);
  setMetaByProperty("og:type", meta.ogType);
  setMetaByProperty("og:site_name", meta.siteName);
  setMetaByProperty("og:title", meta.title);
  setMetaByProperty("og:description", meta.description);
  setMetaByProperty("og:url", meta.url);
  setMetaByProperty("og:image", meta.image);
  setMetaByName("twitter:card", meta.twitterCard);
  setMetaByName("twitter:title", meta.title);
  setMetaByName("twitter:description", meta.description);
  setMetaByName("twitter:image", meta.image);
}
