import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { normalizeDateDisplay, parseDateInputToEpoch } from "../src/app/date-parse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "pages");
const OUTPUT_FILE = path.join(ROOT, "src", "generated", "content.generated.js");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_DIRS = ["images", "svgs"];

const DEFAULT_SITE_DESCRIPTION = "Frinky's portfolio of games, updates, and development posts.";

function normalizeBaseUrl(rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || "";
const SITE_URL = normalizeBaseUrl(RAILWAY_PUBLIC_DOMAIN) || "https://frinky.org";

const SITE_BASE = {
  name: "Frinky",
  author: "Finn Rawlings",
  url: SITE_URL,
};

const EMBED_IFRAME_HOSTNAMES = [
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "itch.io",
  "www.itch.io",
  "store.steampowered.com",
];

function classifyEmbedSource(url) {
  if (!url) return "";

  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com") || host.includes("vimeo.com")) {
      return "video";
    }
    if (host.includes("itch.io")) return "itch";
    if (host.includes("steampowered.com")) return "steam";
  } catch {
    return "";
  }

  return "";
}

function normalizeEmbedUrl(url) {
  const value = (url || "").trim();
  if (!/^https?:\/\//i.test(value)) return "";
  return value;
}

function appendClass(existing, value) {
  const classes = new Set(
    String(existing || "")
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

  for (const className of value) {
    if (className) classes.add(className);
  }

  return [...classes].join(" ");
}

marked.use({
  extensions: [
    {
      name: "spoiler",
      level: "inline",
      start(src) {
        return src.indexOf("||");
      },
      tokenizer(src) {
        if (!src.startsWith("||")) return undefined;
        const match = /^\|\|([\s\S]+?)\|\|/.exec(src);
        if (!match) return undefined;

        const raw = match[0];
        const text = match[1];
        if (!text) return undefined;

        return {
          type: "spoiler",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text),
        };
      },
      renderer(token) {
        return `<span class="md-spoiler" tabindex="0">${this.parser.parseInline(token.tokens)}</span>`;
      },
    },
  ],
});

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

const COLLECTIONS = [
  { type: "post", dir: "posts" },
  { type: "game", dir: "games" },
];

const postGameFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    date: z.string().min(1),
    sortDate: z.string().optional(),
    summary: z.string().optional(),
    pinned: z.boolean().optional(),
    featured: z.boolean().optional(),
    order: z.number().int().optional(),
    image: z.string().optional(),
    downloadUrl: z.string().url().optional(),
  })
  .strict();

const frontmatterSchemas = {
  post: postGameFrontmatterSchema,
  game: postGameFrontmatterSchema.extend({
    image: z.string().min(1),
  }),
  experience: z
    .object({
      title: z.string().min(1),
      date: z.string().min(1),
      meta: z.string().optional(),
      order: z.number().int().optional(),
    })
    .strict(),
  home: z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
    })
    .strict(),
  about: z
    .object({
      name: z.string().min(1),
      birthDate: z.string().optional(),
      image: z.string().optional(),
      imageAlt: z.string().optional(),
    })
    .strict(),
};

function normalizeUrl(url) {
  if (!url) return "";
  const value = url.trim();
  if (!value) return "";

  if (/^(?:[a-z]+:)?\/\//i.test(value) || /^(?:mailto:|tel:|data:|#)/i.test(value) || value.startsWith("/")) {
    return value;
  }

  return `/${value.replace(/^\.?\//, "")}`;
}

function normalizeHtmlUrls(html) {
  if (!html) return "";
  return html.replace(/(src|href)="([^"]+)"/g, (_, attr, value) => {
    const normalized = normalizeUrl(value);
    return `${attr}="${normalized || value}"`;
  });
}

function toEpoch(input) {
  return parseDateInputToEpoch(input);
}

function escapeXml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdownExcerpt(markdown) {
  const plain = (markdown || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\|\|/g, "")
    .replace(/[*_~]/g, "")
    .trim();

  if (!plain) return "";
  const firstLine = plain.split(/\r?\n/).find((line) => line.trim());
  return (firstLine || "").trim();
}

function sanitizeAndRenderMarkdown(markdown, options = {}) {
  const { allowEmbeds = false } = options;
  const rendered = marked.parse(markdown).trim();
  const allowedTags = [
    "p",
    "a",
    "span",
    "img",
    "strong",
    "em",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "br",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ];

  const allowedAttributes = {
    a: ["href", "title", "target", "rel"],
    span: ["class", "tabindex"],
    img: ["src", "alt", "title", "loading"],
    code: ["class"],
    th: ["colspan", "rowspan", "align"],
    td: ["colspan", "rowspan", "align"],
  };

  if (allowEmbeds) {
    allowedTags.push("iframe", "video", "source");
    allowedAttributes.iframe = [
      "src",
      "title",
      "width",
      "height",
      "allow",
      "allowfullscreen",
      "frameborder",
      "loading",
      "referrerpolicy",
      "class",
    ];
    allowedAttributes.video = [
      "src",
      "poster",
      "preload",
      "controls",
      "autoplay",
      "muted",
      "loop",
      "playsinline",
      "class",
    ];
    allowedAttributes.source = ["src", "type"];
  }

  const transformTags = {
    a: (tagName, attribs) => {
      const href = normalizeUrl(attribs.href || "");
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          href,
          ...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {}),
        },
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        src: normalizeUrl(attribs.src || ""),
        loading: "lazy",
      },
    }),
  };

  if (allowEmbeds) {
    transformTags.iframe = (tagName, attribs) => {
      const src = normalizeEmbedUrl(attribs.src || "");
      const sourceType = classifyEmbedSource(src);
      const className = appendClass(attribs.class, ["md-embed", "md-embed-iframe", sourceType && `md-embed-${sourceType}`]);

      return {
        tagName,
        attribs: {
          ...attribs,
          src,
          loading: "lazy",
          referrerpolicy: attribs.referrerpolicy || "strict-origin-when-cross-origin",
          frameborder: attribs.frameborder || "0",
          class: className,
        },
      };
    };

    transformTags.video = (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        src: normalizeUrl(attribs.src || ""),
        preload: attribs.preload || "metadata",
        controls: attribs.controls === undefined ? "controls" : attribs.controls,
        class: appendClass(attribs.class, ["md-embed", "md-embed-video"]),
      },
    });

    transformTags.source = (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        src: normalizeUrl(attribs.src || ""),
      },
    });
  }

  const sanitized = sanitizeHtml(rendered, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    allowedIframeHostnames: allowEmbeds ? EMBED_IFRAME_HOSTNAMES : [],
    transformTags,
    exclusiveFilter(frame) {
      if (!allowEmbeds) return false;
      if (frame.tag === "iframe" && !frame.attribs.src) return true;
      return false;
    },
  });

  return normalizeHtmlUrls(sanitized);
}

function compareEntries(a, b) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  const aHasOrder = typeof a.order === "number";
  const bHasOrder = typeof b.order === "number";
  if (aHasOrder && bHasOrder && a.order !== b.order) {
    return a.order - b.order;
  }
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;

  if (a.sortEpoch !== b.sortEpoch) return b.sortEpoch - a.sortEpoch;
  return a.title.localeCompare(b.title);
}

function compareExperience(a, b) {
  const aHasOrder = typeof a.order === "number";
  const bHasOrder = typeof b.order === "number";
  if (aHasOrder && bHasOrder && a.order !== b.order) return a.order - b.order;
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  return a.title.localeCompare(b.title);
}

function routeForEntry(entry) {
  if (entry.type === "post") return `/posts/${entry.slug}/`;
  if (entry.type === "game") return `/games/${entry.slug}/`;
  return "/";
}

function parseFrontmatter(type, data, sourcePath) {
  const schema = frontmatterSchemas[type];
  if (!schema) {
    throw new Error(`Unsupported frontmatter schema type '${type}' for ${sourcePath}`);
  }

  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => {
      const field = issue.path.join(".") || "frontmatter";
      return `${field}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Invalid frontmatter in ${sourcePath}: ${issues}`);
}

function outputEntry(entry) {
  const out = {
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    date: entry.date,
    summary: entry.summary,
    pinned: entry.pinned,
    featured: entry.featured,
    order: entry.order,
    image: entry.image,
    contentHtml: entry.contentHtml,
  };

  if (entry.downloadUrl) out.downloadUrl = entry.downloadUrl;
  if (entry.sortDate) out.sortDate = entry.sortDate;

  return out;
}

async function readMarkdownFile(filePath, type) {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = parseFrontmatter(type, data, filePath);
  return { frontmatter, content };
}

async function readCollection({ type, dir }) {
  const collectionDir = path.join(PAGES_DIR, dir);
  const files = (await fs.readdir(collectionDir)).filter((name) => name.endsWith(".md")).sort();

  const entries = [];
  const seenSlugs = new Set();

  for (const fileName of files) {
    const fullPath = path.join(collectionDir, fileName);
    const { frontmatter, content } = await readMarkdownFile(fullPath, type);
    const slug = frontmatter.slug;

    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug '${slug}' in ${collectionDir}`);
    }
    seenSlugs.add(slug);

    const sortDate = frontmatter.sortDate || "";
    const sortEpoch = toEpoch(sortDate) || toEpoch(frontmatter.date);
    const summary = frontmatter.summary?.trim() || stripMarkdownExcerpt(content);

    entries.push({
      type,
      title: frontmatter.title.trim(),
      slug,
      date: normalizeDateDisplay(frontmatter.date),
      sortDate,
      sortEpoch,
      summary,
      pinned: frontmatter.pinned ?? false,
      featured: frontmatter.featured ?? false,
      order: frontmatter.order ?? null,
      image: normalizeUrl(frontmatter.image || ""),
      downloadUrl: frontmatter.downloadUrl || "",
      contentHtml: sanitizeAndRenderMarkdown(content, { allowEmbeds: true }),
    });
  }

  return entries;
}

async function readExperienceCollection() {
  const collectionDir = path.join(PAGES_DIR, "experience");
  const files = (await fs.readdir(collectionDir)).filter((name) => name.endsWith(".md")).sort();

  const entries = [];
  for (const fileName of files) {
    const fullPath = path.join(collectionDir, fileName);
    const { frontmatter } = await readMarkdownFile(fullPath, "experience");

    entries.push({
      title: frontmatter.title.trim(),
      date: frontmatter.date.trim(),
      meta: (frontmatter.meta || "").trim(),
      order: frontmatter.order ?? null,
    });
  }

  return entries.sort(compareExperience);
}

async function readHomePage() {
  const fullPath = path.join(PAGES_DIR, "home.md");
  const { frontmatter, content } = await readMarkdownFile(fullPath, "home");
  const summary = frontmatter.summary?.trim() || stripMarkdownExcerpt(content) || DEFAULT_SITE_DESCRIPTION;

  return {
    title: (frontmatter.title || "Home").trim(),
    summary,
    contentHtml: sanitizeAndRenderMarkdown(content),
  };
}

async function readAboutPage() {
  const fullPath = path.join(PAGES_DIR, "about.md");
  const { frontmatter, content } = await readMarkdownFile(fullPath, "about");

  return {
    name: frontmatter.name.trim(),
    birthDate: normalizeDateDisplay(frontmatter.birthDate || ""),
    image: normalizeUrl(frontmatter.image || "/images/frog.png"),
    imageAlt: (frontmatter.imageAlt || "").trim(),
    contentHtml: sanitizeAndRenderMarkdown(content),
  };
}

async function writeSitemap(payload) {
  const nowIso = new Date().toISOString();
  const staticPaths = ["/", "/about/", "/contact/", "/posts/", "/games/"];
  const contentPaths = [...payload.posts, ...payload.games].map((entry) => routeForEntry(entry));

  const urls = [...new Set([...staticPaths, ...contentPaths])]
    .map((route) => `  <url><loc>${escapeXml(`${SITE_URL}${route}`)}</loc><lastmod>${nowIso}</lastmod></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
}

async function writeRss(payload, site) {
  const entries = [...payload.posts, ...payload.games].sort(
    (a, b) => (toEpoch(b.sortDate || b.date) || 0) - (toEpoch(a.sortDate || a.date) || 0)
  );

  const itemsXml = entries
    .map((entry) => {
      const route = entry.type === "post" ? `/posts/${entry.slug}/` : `/games/${entry.slug}/`;
      const link = `${site.url}${route}`;
      const pubDate = new Date(toEpoch(entry.sortDate || entry.date) || Date.now()).toUTCString();
      const category = entry.type === "post" ? "Post" : "Game";

      return [
        "  <item>",
        `    <title>${escapeXml(entry.title)}</title>`,
        `    <link>${escapeXml(link)}</link>`,
        `    <guid>${escapeXml(link)}</guid>`,
        `    <description>${escapeXml(entry.summary || "")}</description>`,
        `    <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `    <category>${category}</category>`,
        "  </item>",
      ].join("\n");
    })
    .join("\n");

  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `  <title>${escapeXml(site.name)}</title>`,
    `  <link>${escapeXml(site.url)}</link>`,
    `  <description>${escapeXml(site.description || DEFAULT_SITE_DESCRIPTION)}</description>`,
    `  <atom:link href="${escapeXml(`${site.url}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    `  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>`,
    itemsXml,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");

  await fs.writeFile(path.join(PUBLIC_DIR, "rss.xml"), rss, "utf8");
}

async function writeRobots(site) {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`;
  await Promise.all([
    fs.writeFile(path.join(PUBLIC_DIR, "robots.txt"), robots, "utf8"),
    fs.writeFile(path.join(ROOT, "robots.txt"), robots, "utf8"),
  ]);
}

async function copyDirectory(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, targetPath);
        return;
      }

      if (entry.isFile()) {
        await fs.copyFile(sourcePath, targetPath);
      }
    })
  );
}

async function syncStaticAssets() {
  await Promise.all(
    STATIC_DIRS.map(async (dirName) => {
      const sourceDir = path.join(ROOT, dirName);
      const targetDir = path.join(PUBLIC_DIR, dirName);

      try {
        await fs.access(sourceDir);
      } catch {
        return;
      }

      await fs.rm(targetDir, { recursive: true, force: true });
      await copyDirectory(sourceDir, targetDir);
    })
  );
}

export async function generateContent() {
  const bucket = { post: [], game: [] };

  for (const collection of COLLECTIONS) {
    const entries = await readCollection(collection);
    bucket[collection.type].push(...entries);
  }

  const posts = bucket.post.sort(compareEntries);
  const games = bucket.game.sort(compareEntries);
  const featuredCandidates = games.filter((item) => item.featured).sort(compareEntries);
  const featured = featuredCandidates[0] || games[0] || null;

  const home = await readHomePage();
  const about = await readAboutPage();
  const experience = await readExperienceCollection();

  const site = {
    ...SITE_BASE,
    description: home.summary || DEFAULT_SITE_DESCRIPTION,
  };

  const payload = {
    site,
    posts: posts.map(outputEntry),
    games: games.map(outputEntry),
    featured: featured ? outputEntry(featured) : null,
    experience,
    home,
    about,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await syncStaticAssets();

  await fs.writeFile(
    OUTPUT_FILE,
    `// Auto-generated by scripts/generate-content.mjs. Do not edit directly.\nexport const CONTENT = ${JSON.stringify(payload, null, 2)};\n`,
    "utf8"
  );

  await Promise.all([writeSitemap(payload), writeRss(payload, site), writeRobots(site)]);

  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateContent().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
