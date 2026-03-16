import { daysAgo, yearsAgo } from "./date.js";

function preloadImage(src, id) {
  if (!src) return;
  const existing = id ? document.getElementById(id) : null;
  if (existing && existing.href === src) return;
  const link = existing || document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  if (id) link.id = id;
  link.href = src;
  document.head.appendChild(link);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.decode) {
        img
          .decode()
          .then(() => resolve(src))
          .catch(() => resolve(src));
        return;
      }
      resolve(src);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function ensureLoader(el) {
  if (!el) return null;
  let loader = el.querySelector(".loading-spinner");
  if (!loader) {
    loader = document.createElement("div");
    loader.className = "loading-spinner";
    el.appendChild(loader);
  }
  return loader;
}

function withExternalLinkAttrs(html) {
  if (!html) return "";

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
  });

  return wrapper.innerHTML;
}

export function createUI({ model, onOpenDetail, onNavigateSection }) {
  const feeds = {
    posts: {
      items: model.posts,
      type: "post",
      meta: (item) => daysAgo(item.sortDate || item.date),
    },
    experience: {
      items: model.experience,
      type: "experience",
      meta: (item) => item.meta ?? "",
    },
    games: {
      items: model.games,
      type: "game",
      meta: (item) => item.date || "",
    },
  };

  function showSection(section) {
    if (!section) return;

    document.querySelectorAll(".page-section").forEach((sec) => {
      const id = sec.id.replace("section-", "");
      sec.classList.toggle("hidden", id !== section);
    });

    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === section);
    });
  }

  function buildList(feed, listEl) {
    if (!listEl || !feed?.items) return;
    listEl.innerHTML = "";
    const { items, meta: metaFn, type } = feed;

    items.forEach((item) => {
      const li = document.createElement("li");
      const date = document.createElement("div");
      const isDetailable = Boolean(item.slug && (type === "post" || type === "game"));
      const link = document.createElement(isDetailable ? "a" : "div");
      const meta = document.createElement("div");

      date.className = "date";
      date.textContent = item.date ? `[${item.date}]` : "";

      link.className = "link";
      if (isDetailable) link.href = "#";
      link.textContent = item.title || item.text || "Untitled";

      meta.className = "meta";
      meta.textContent =
        type === "experience"
          ? typeof metaFn === "function"
            ? metaFn(item)
            : item.meta ?? ""
          : typeof metaFn === "function"
          ? metaFn(item)
          : item.meta ?? "";

      if (isDetailable) {
        li.dataset.slug = item.slug;
        li.dataset.type = type;
        link.addEventListener("click", (ev) => {
          ev.preventDefault();
          onOpenDetail(type, item.slug);
        });
      }

      li.append(date, link, meta);
      listEl.appendChild(li);
    });
  }

  function renderPostsList() {
    const list = document.querySelector("#registry-list");
    if (!list) return;
    const feed = { ...feeds.posts, items: model.posts.slice(0, model.maxPosts) };
    buildList(feed, list);
  }

  function renderGamesList() {
    const list = document.querySelector("#games-list");
    if (!list) return;
    buildList(feeds.games, list);
  }

  function renderAllPostsList() {
    const list = document.querySelector("#all-posts-list");
    if (!list) return;
    buildList(feeds.posts, list);
  }

  function renderAllGamesList() {
    const list = document.querySelector("#all-games-list");
    if (!list) return;
    buildList(feeds.games, list);
  }

  function renderLists() {
    renderPostsList();
    renderGamesList();
    renderAllPostsList();
    renderAllGamesList();

    const expList = document.querySelector("#experience-list");
    buildList(feeds.experience, expList);
  }

  function renderAboutAge() {
    const metaEl = document.querySelector("#about-age");
    if (!metaEl) return;

    const birthDate = "24 Sep 2004";
    const age = yearsAgo(birthDate);
    const suffix = typeof age === "number" && age >= 0 ? ` (${age} years ago)` : "";
    metaEl.textContent = `Born ${birthDate}${suffix}`;
  }

  function setupContactActions() {
    const emailBtn = document.querySelector("[data-action='copy-email']");
    if (!emailBtn) return;

    const email = emailBtn.dataset.email || "";
    const labelEl = emailBtn.querySelector(".social-label");
    const originalLabel = labelEl?.textContent || "Copy email";

    const setLabel = (text) => {
      if (!labelEl) return;
      labelEl.textContent = text;
      setTimeout(() => {
        labelEl.textContent = originalLabel;
      }, 1500);
    };

    emailBtn.addEventListener("click", async () => {
      if (!email) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = email;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setLabel("Copied!");
      } catch {
        setLabel("Copy failed");
      }
    });
  }

  function setFeatureBackground(image) {
    const win = document.querySelector(".feature-window");
    if (!win) return;

    ensureLoader(win);
    const token = Symbol("feature-bg");
    win._bgToken = token;
    const placeholder = "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)";

    if (!image) {
      win.classList.remove("loading");
      win.style.backgroundImage = placeholder;
      win.style.backgroundSize = "cover";
      win.style.backgroundPosition = "center";
      win.style.backgroundBlendMode = "normal";
      return;
    }

    win.classList.add("loading");
    win.style.backgroundImage = placeholder;
    win.style.backgroundSize = "cover";
    win.style.backgroundPosition = "center";
    win.style.backgroundBlendMode = "normal";

    loadImage(image)
      .then(() => {
        if (win._bgToken !== token) return;
        win.style.backgroundImage = `url('${image}'), ${placeholder}`;
        win.style.backgroundSize = "cover, cover";
        win.style.backgroundPosition = "center, center";
        win.style.backgroundBlendMode = "normal, overlay";
      })
      .catch(() => {
        if (win._bgToken !== token) return;
        win.style.backgroundImage = placeholder;
        win.style.backgroundSize = "cover";
        win.style.backgroundPosition = "center";
        win.style.backgroundBlendMode = "normal";
      })
      .finally(() => {
        if (win._bgToken === token) win.classList.remove("loading");
      });
  }

  function renderFeatured(game) {
    if (!game) return;

    const titleEl = document.querySelector("[data-slot='feature-title']");
    const windowEl = document.querySelector(".feature-window");
    const blurbEl = document.querySelector("#feature-blurb");

    if (titleEl) titleEl.textContent = "";

    const fallbackImage = model.findEntry("game", game.slug || "")?.image || model.games.find((g) => g.image)?.image;
    const heroImage = game.image || fallbackImage;
    preloadImage(heroImage, "preload-feature-image");
    setFeatureBackground(heroImage);

    if (blurbEl) {
      const title = game.title || "Untitled";
      const datePart = game.date ? `${game.date}` : "";
      const ago = game.sortDate || game.date ? ` (${daysAgo(game.sortDate || game.date)})` : "";
      const body = game.summary || "No description available.";

      blurbEl.innerHTML = `
        <div class="feature-blurb-title">${title}</div>
        <div class="blurb-body">${body}</div>
        <div class="detail-meta">${datePart}${ago}</div>
      `;
    }

    if (windowEl) {
      const hasSlug = Boolean(game.slug);
      windowEl.classList.toggle("clickable", hasSlug);
      windowEl.tabIndex = hasSlug ? 0 : -1;

      const activate = () => {
        if (hasSlug) onOpenDetail("game", game.slug);
      };

      windowEl.onclick = hasSlug ? activate : null;
      windowEl.onkeydown = hasSlug
        ? (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              activate();
            }
          }
        : null;
    }
  }

  function setDetailHero(image) {
    const hero = document.querySelector("#section-detail .detail-hero");
    if (!hero) return;

    ensureLoader(hero);
    const token = Symbol("detail-bg");
    hero._bgToken = token;
    const placeholder = "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.6))";

    if (!image) {
      hero.classList.remove("loading");
      hero.style.backgroundImage = placeholder;
      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
      hero.style.backgroundBlendMode = "overlay";
      return;
    }

    hero.classList.add("loading");
    hero.style.backgroundImage = placeholder;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.style.backgroundBlendMode = "overlay";
    preloadImage(image, "preload-detail-image");

    loadImage(image)
      .then(() => {
        if (hero._bgToken !== token) return;
        hero.style.backgroundImage = `url('${image}'), ${placeholder}`;
        hero.style.backgroundSize = "cover, cover";
        hero.style.backgroundPosition = "center, center";
        hero.style.backgroundBlendMode = "overlay, normal";
      })
      .catch(() => {
        if (hero._bgToken !== token) return;
        hero.style.backgroundImage = placeholder;
        hero.style.backgroundSize = "cover";
        hero.style.backgroundPosition = "center";
        hero.style.backgroundBlendMode = "overlay";
      })
      .finally(() => {
        if (hero._bgToken === token) hero.classList.remove("loading");
      });
  }

  function renderDetail(entry, type) {
    const detailSection = document.getElementById("section-detail");
    const titleEl = detailSection?.querySelector(".detail-title");
    const metaEl = detailSection?.querySelector(".detail-meta");
    const bodyEl = detailSection?.querySelector("#detail-body");
    const meta = entry.date || entry.meta || "";

    if (titleEl) titleEl.textContent = entry.title || "Untitled";
    if (metaEl) metaEl.textContent = meta;

    if (bodyEl) {
      const contentHtml = withExternalLinkAttrs(entry.contentHtml) || "<p>More details coming soon.</p>";
      const downloadButton =
        type === "game" && entry.downloadUrl
          ? `<a href="${entry.downloadUrl}" target="_blank" rel="noopener noreferrer" class="download-btn">Download / Play</a>`
          : "";

      bodyEl.innerHTML = contentHtml + downloadButton;
    }

    setDetailHero(entry.image);
  }

  function setupNav() {
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        const target = link.dataset.nav;
        if (target) onNavigateSection(target);
      });
    });

    const postsAll = document.querySelector("[data-action='view-all-posts']");
    if (postsAll) {
      postsAll.addEventListener("click", (ev) => {
        ev.preventDefault();
        onNavigateSection("posts-all");
      });
    }

    const gamesAll = document.querySelector("[data-action='view-all-games']");
    if (gamesAll) {
      gamesAll.addEventListener("click", (ev) => {
        ev.preventDefault();
        onNavigateSection("games-all");
      });
    }

    document.querySelectorAll("[data-action='back-home']").forEach((backHome) => {
      backHome.addEventListener("click", (ev) => {
        ev.preventDefault();
        onNavigateSection("home");
      });
    });
  }

  function init() {
    renderFeatured(model.featured);
    renderLists();
    renderAboutAge();
    setupContactActions();
    setupNav();
  }

  return {
    init,
    showSection,
    renderDetail,
  };
}
