import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";
import { generateContent } from "./scripts/generate-content.mjs";
import { formatBirthDateLabel, formatDateWithRelative, formatEntryMeta } from "./src/app/date.js";
import { DEFAULT_IMAGE_PATH, getRouteMeta } from "./src/app/route-meta.js";
import { routeToPath } from "./src/app/routing.js";

const PAGES_GLOB = /[\\/]pages[\\/].*\.md$/;
const SECTION_IDS = ["home", "posts-all", "games-all", "about", "contact", "detail"];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function upsertHeadTag(html, regex, tagLine) {
  if (regex.test(html)) return html.replace(regex, tagLine);
  return html.replace("</head>", `  ${tagLine}\n</head>`);
}

function replaceElementInnerById(html, id, innerHtml) {
  const pattern = new RegExp(`(<([a-z0-9-]+)[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</\\2>)`, "i");
  return html.replace(pattern, (match, openingTag, tagName, currentInner, closingTag) => `${openingTag}${innerHtml}${closingTag}`);
}

function updateOpeningTagById(html, id, updater) {
  const pattern = new RegExp(`<([a-z0-9-]+)([^>]*\\bid=["']${id}["'][^>]*)>`, "i");
  return html.replace(pattern, (match, tagName, attrs) => `<${tagName}${updater(attrs)}>`);
}

function setAttributeInAttrs(attrs, name, value) {
  const safeValue = escapeHtml(String(value ?? ""));
  const pattern = new RegExp(`\\s${name}=(["']).*?\\1`, "i");
  if (pattern.test(attrs)) {
    return attrs.replace(pattern, ` ${name}="${safeValue}"`);
  }
  return `${attrs} ${name}="${safeValue}"`;
}

function toggleClassInAttrs(attrs, className, enabled) {
  const classMatch = attrs.match(/\sclass=(["'])(.*?)\1/i);
  const classes = new Set(
    String(classMatch?.[2] || "")
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (enabled) classes.add(className);
  else classes.delete(className);

  const classValue = [...classes].join(" ");
  if (classMatch) {
    if (!classValue) return attrs.replace(classMatch[0], "");
    return attrs.replace(classMatch[0], ` class="${escapeHtml(classValue)}"`);
  }
  if (!classValue) return attrs;
  return `${attrs} class="${escapeHtml(classValue)}"`;
}

function entryPath(entry) {
  if (!entry?.slug) return "/";
  return routeToPath({
    section: "detail",
    type: entry.type === "post" ? "post" : "game",
    slug: entry.slug,
  });
}

function outputPathForRoute(outDir, route) {
  const pathname = routeToPath(route);
  if (pathname === "/") return path.join(outDir, "index.html");
  const parts = pathname.replace(/^\/|\/$/g, "");
  return path.join(outDir, parts, "index.html");
}

function renderListItems(items, type) {
  return items
    .map((item) => {
      const title = escapeHtml(item.title || item.text || "Untitled");
      const date = item.date ? `[${escapeHtml(item.date)}]` : "";
      const meta = escapeHtml(formatEntryMeta(item, type));

      const linkHtml =
        type === "post" || type === "game"
          ? `<a class="link" href="${escapeHtml(entryPath({ ...item, type }))}">${title}</a>`
          : `<div class="link">${title}</div>`;

      return [
        "<li>",
        `  <div class="date">${date}</div>`,
        `  ${linkHtml}`,
        `  <div class="meta">${meta}</div>`,
        "</li>",
      ].join("\n");
    })
    .join("\n");
}

function renderFeaturedBlurb(entry) {
  if (!entry) return "";

  const title = escapeHtml(entry.title || "Untitled");
  const summary = escapeHtml(entry.summary || "No description available.");
  const meta = escapeHtml(formatDateWithRelative(entry));

  return [
    `<div class="feature-blurb-title">${title}</div>`,
    `<div class="blurb-body">${summary}</div>`,
    `<div class="detail-meta">${meta}</div>`,
  ].join("\n");
}

function renderDetailBody(entry, type) {
  const contentHtml = entry?.contentHtml || "<p>More details coming soon.</p>";
  if (type !== "game" || !entry?.downloadUrl) return contentHtml;
  const downloadUrl = escapeHtml(entry.downloadUrl);
  return `${contentHtml}\n<a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="download-btn">Download / Play</a>`;
}

function featureStyle(image) {
  const placeholder = "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)";
  if (!image) {
    return `background-image: ${placeholder}; background-size: cover; background-position: center; background-blend-mode: normal;`;
  }

  const safeImage = String(image).replace(/'/g, "%27");
  return `background-image: url('${safeImage}'), ${placeholder}; background-size: cover, cover; background-position: center, center; background-blend-mode: normal, overlay;`;
}

function detailHeroStyle(image) {
  const placeholder = "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.6))";
  if (!image) {
    return `background-image: ${placeholder}; background-size: cover; background-position: center; background-blend-mode: overlay;`;
  }

  const safeImage = String(image).replace(/'/g, "%27");
  return `background-image: url('${safeImage}'), ${placeholder}; background-size: cover, cover; background-position: center, center; background-blend-mode: overlay, normal;`;
}

function sectionIdForRoute(route) {
  if (route.section === "detail") return "detail";
  return route.section;
}

function applySharedContent(html, payload) {
  const siteName = payload?.site?.name || "Frinky";
  const featured = payload?.featured || payload?.games?.[0] || null;
  const about = payload?.about || {};

  let output = html;
  output = replaceElementInnerById(output, "home-intro-content", payload?.home?.contentHtml || "");
  output = replaceElementInnerById(output, "registry-list", renderListItems((payload?.posts || []).slice(0, 8), "post"));
  output = replaceElementInnerById(output, "games-list", renderListItems(payload?.games || [], "game"));
  output = replaceElementInnerById(output, "all-posts-list", renderListItems(payload?.posts || [], "post"));
  output = replaceElementInnerById(output, "all-games-list", renderListItems(payload?.games || [], "game"));
  output = replaceElementInnerById(output, "experience-list", renderListItems(payload?.experience || [], "experience"));
  output = replaceElementInnerById(output, "feature-title", escapeHtml(featured?.title || siteName));
  output = replaceElementInnerById(output, "feature-blurb", renderFeaturedBlurb(featured));
  output = replaceElementInnerById(output, "about-name", escapeHtml(about.name || "Finn Rawlings (Frinky)"));
  output = replaceElementInnerById(output, "about-content", about.contentHtml || "");
  output = replaceElementInnerById(
    output,
    "about-age",
    escapeHtml(formatBirthDateLabel(about.birthDate))
  );

  output = updateOpeningTagById(output, "feature-link", (attrs) => {
    let next = setAttributeInAttrs(attrs, "href", featured ? entryPath({ ...featured, type: "game" }) : "/games/");
    next = setAttributeInAttrs(next, "aria-label", featured?.title ? `Open ${featured.title}` : "Browse games");
    return setAttributeInAttrs(next, "style", featureStyle(featured?.image || DEFAULT_IMAGE_PATH));
  });

  output = updateOpeningTagById(output, "about-window", (attrs) =>
    setAttributeInAttrs(attrs, "aria-label", about.imageAlt || "Frog illustration for Finn Rawlings")
  );
  output = updateOpeningTagById(output, "about-image", (attrs) => {
    let next = setAttributeInAttrs(attrs, "src", about.image || DEFAULT_IMAGE_PATH);
    next = setAttributeInAttrs(next, "alt", about.imageAlt || "");
    return next;
  });

  return output;
}

function applyRouteVisibility(html, route) {
  const visibleSectionId = sectionIdForRoute(route);
  return SECTION_IDS.reduce((output, sectionId) => {
    const isVisible = sectionId === visibleSectionId;
    return updateOpeningTagById(output, `section-${sectionId}`, (attrs) => toggleClassInAttrs(attrs, "hidden", !isVisible));
  }, html);
}

function applyDetailContent(html, entry, type) {
  if (!entry || !type) return html;

  let output = html;
  output = replaceElementInnerById(output, "detail-title", escapeHtml(entry.title || "Untitled"));
  output = replaceElementInnerById(output, "detail-meta", escapeHtml(entry.date || entry.meta || ""));
  output = replaceElementInnerById(output, "detail-body", renderDetailBody(entry, type));
  output = updateOpeningTagById(output, "detail-hero", (attrs) => setAttributeInAttrs(attrs, "style", detailHeroStyle(entry.image)));
  return output;
}

function injectRouteSeo(indexHtml, meta) {
  let html = indexHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  html = upsertHeadTag(
    html,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`
  );

  html = html
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "");

  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta name="twitter:card" content="${escapeHtml(meta.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ];

  if (meta.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`);
  }

  const block = tags.map((tag) => `  ${tag}`).join("\n");
  return html.replace("</head>", `${block}\n</head>`);
}

function buildPrerenderedRouteHtml(indexHtml, payload, route, entry) {
  const meta = getRouteMeta({ route, entry, content: payload });
  let html = injectRouteSeo(indexHtml, meta);
  html = applySharedContent(html, payload);
  html = applyRouteVisibility(html, route);

  if (route.section === "detail") {
    html = applyDetailContent(html, entry, route.type);
  }

  return html;
}

async function generateRoutePages({ outDir, indexHtml, payload, logger }) {
  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  const games = Array.isArray(payload?.games) ? payload.games : [];
  const staticRoutes = [
    { section: "home" },
    { section: "about" },
    { section: "contact" },
    { section: "posts-all" },
    { section: "games-all" },
  ];
  const detailRoutes = [
    ...posts.map((entry) => ({ route: { section: "detail", type: "post", slug: entry.slug }, entry: { ...entry, type: "post" } })),
    ...games.map((entry) => ({ route: { section: "detail", type: "game", slug: entry.slug }, entry: { ...entry, type: "game" } })),
  ];

  let written = 0;

  for (const route of staticRoutes) {
    const outputPath = outputPathForRoute(outDir, route);
    const routeHtml = buildPrerenderedRouteHtml(indexHtml, payload, route, null);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, routeHtml, "utf8");
    written += 1;
  }

  for (const { route, entry } of detailRoutes) {
    const outputPath = outputPathForRoute(outDir, route);
    const routeHtml = buildPrerenderedRouteHtml(indexHtml, payload, route, entry);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, routeHtml, "utf8");
    written += 1;
  }

  logger?.info(`[content] generated prerendered route html (${written} pages)`);
}

function contentPlugin() {
  let latestPayload = null;
  let resolvedConfig = null;

  const rebuild = async (logger) => {
    latestPayload = await generateContent();
    logger?.info("[content] generated markdown content index");
    return latestPayload;
  };

  return {
    name: "markdown-content-generator",
    async configResolved(config) {
      resolvedConfig = config;
      this.__logger = config.logger;
    },
    async buildStart() {
      await rebuild(this.__logger);
    },
    async closeBundle() {
      if (!resolvedConfig || resolvedConfig.command !== "build") return;

      const root = resolvedConfig.root || process.cwd();
      const outDir = path.resolve(root, resolvedConfig.build?.outDir || "dist");
      const indexPath = path.join(outDir, "index.html");

      let indexHtml = "";
      try {
        indexHtml = await fs.readFile(indexPath, "utf8");
      } catch (error) {
        this.__logger?.warn(`[content] skipped prerendered route html generation: ${(error && error.message) || error}`);
        return;
      }

      const payload = latestPayload || (await rebuild(this.__logger));
      await generateRoutePages({
        outDir,
        indexHtml,
        payload,
        logger: this.__logger,
      });
    },
    configureServer(server) {
      rebuild(server.config.logger).catch((error) => {
        server.config.logger.error(error?.message || String(error));
      });

      const refresh = async (file) => {
        if (!PAGES_GLOB.test(file)) return;
        try {
          await rebuild(server.config.logger);
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          server.config.logger.error(error?.message || String(error));
        }
      };

      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
    },
  };
}

export default defineConfig({
  plugins: [contentPlugin()],
});
