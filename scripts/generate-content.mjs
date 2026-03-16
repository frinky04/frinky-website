import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "pages");
const OUTPUT_FILE = path.join(ROOT, "src", "generated", "content.generated.js");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_DIRS = ["images", "svgs"];

function normalizeBaseUrl(rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || "";
const SITE_URL = normalizeBaseUrl(RAILWAY_PUBLIC_DOMAIN) || "https://frinky.org";

const SITE = {
  name: "Frinky",
  // description: "Frinky's portfolio of games, updates, and development posts.",
  author: "Finn Rawlings",
  url: SITE_URL,
};

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
});

const COLLECTIONS = [
  { type: "post", dir: "posts" },
  { type: "game", dir: "games" },
];

const baseFrontmatterSchema = z
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
  post: baseFrontmatterSchema,
  game: baseFrontmatterSchema.extend({
    image: z.string().min(1),
  }),
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
  if (!input || typeof input !== "string") return 0;
  const timestamp = Date.parse(input);
  return Number.isNaN(timestamp) ? 0 : timestamp;
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
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .trim();

  if (!plain) return "";
  const firstLine = plain.split(/\r?\n/).find((line) => line.trim());
  return (firstLine || "").trim();
}

function sanitizeAndRenderMarkdown(markdown) {
  const rendered = marked.parse(markdown).trim();

  const sanitized = sanitizeHtml(rendered, {
    allowedTags: [
      "p",
      "a",
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
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading"],
      code: ["class"],
      th: ["colspan", "rowspan", "align"],
      td: ["colspan", "rowspan", "align"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
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

function routeForEntry(entry) {
  if (entry.type === "post") return `/posts/${entry.slug}/`;
  if (entry.type === "game") return `/games/${entry.slug}/`;
  return "/";
}

function parseFrontmatter(type, data, fullPath) {
  const parsed = frontmatterSchemas[type].safeParse(data);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => {
      const field = issue.path.join(".") || "frontmatter";
      return `${field}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Invalid frontmatter in ${fullPath}: ${issues}`);
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

async function readCollection({ type, dir }) {
  const collectionDir = path.join(PAGES_DIR, dir);
  const files = (await fs.readdir(collectionDir)).filter((name) => name.endsWith(".md")).sort();

  const entries = [];
  const seenSlugs = new Set();

  for (const fileName of files) {
    const fullPath = path.join(collectionDir, fileName);
    const raw = await fs.readFile(fullPath, "utf8");
    const { data, content } = matter(raw);

    const frontmatter = parseFrontmatter(type, data, fullPath);
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
      date: frontmatter.date.trim(),
      sortDate,
      sortEpoch,
      summary,
      pinned: frontmatter.pinned ?? false,
      featured: frontmatter.featured ?? false,
      order: frontmatter.order ?? null,
      image: normalizeUrl(frontmatter.image || ""),
      downloadUrl: frontmatter.downloadUrl || "",
      contentHtml: sanitizeAndRenderMarkdown(content),
    });
  }

  return entries;
}

async function writeSitemap(payload) {
  const nowIso = new Date().toISOString();
  const staticPaths = ["/", "/about/", "/contact/", "/posts/", "/games/"];
  const contentPaths = [...payload.posts, ...payload.games].map((entry) => routeForEntry(entry));

  const urls = [...new Set([...staticPaths, ...contentPaths])]
    .map((route) => `  <url><loc>${escapeXml(`${SITE.url}${route}`)}</loc><lastmod>${nowIso}</lastmod></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
}

async function writeRss(payload) {
  const entries = [...payload.posts, ...payload.games].sort(
    (a, b) => (toEpoch(b.sortDate || b.date) || 0) - (toEpoch(a.sortDate || a.date) || 0)
  );

  const itemsXml = entries
    .map((entry) => {
      const route = entry.type === "post" ? `/posts/${entry.slug}/` : `/games/${entry.slug}/`;
      const link = `${SITE.url}${route}`;
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
    `  <title>${escapeXml(SITE.name)}</title>`,
    `  <link>${escapeXml(SITE.url)}</link>`,
    `  <atom:link href="${escapeXml(`${SITE.url}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    `  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>`,
    itemsXml,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");

  await fs.writeFile(path.join(PUBLIC_DIR, "rss.xml"), rss, "utf8");
}

async function writeRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`;
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

  const payload = {
    site: SITE,
    posts: posts.map(outputEntry),
    games: games.map(outputEntry),
    featured: featured ? outputEntry(featured) : null,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await syncStaticAssets();

  await fs.writeFile(
    OUTPUT_FILE,
    `// Auto-generated by scripts/generate-content.mjs. Do not edit directly.\nexport const CONTENT = ${JSON.stringify(payload, null, 2)};\n`,
    "utf8"
  );

  await Promise.all([writeSitemap(payload), writeRss(payload), writeRobots()]);

  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateContent().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
