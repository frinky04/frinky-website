import { formatDateWithRelative } from "../date.js";
import { routeToPath } from "../routing.js";
import { isPlainLeftClick } from "./helpers.js";
import { setBackgroundImage } from "./media.js";

export function createFeatureRenderer({ model, onOpenDetail }) {
  function renderFeatured(game) {
    if (!game) return;

    const titleEl = document.querySelector("[data-slot='feature-title']");
    const windowEl = document.querySelector("[data-feature-link]");
    const blurbEl = document.querySelector("#feature-blurb");
    const title = game.title || "Untitled";
    const detailRoute = game.slug ? { section: "detail", type: "game", slug: game.slug } : { section: "games-all" };
    const detailPath = routeToPath(detailRoute);
    const fallbackImage = model.findEntry("game", game.slug || "")?.image || model.games.find((item) => item.image)?.image;
    const heroImage = game.image || fallbackImage;

    if (titleEl) titleEl.textContent = title;

    setBackgroundImage(windowEl, {
      image: heroImage,
      preloadId: "preload-feature-image",
      placeholder: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)",
      fallbackBlendMode: "normal",
      loadedBlendMode: "normal, overlay",
    });

    if (blurbEl) {
      const titleNode = document.createElement("div");
      titleNode.className = "feature-blurb-title";
      titleNode.textContent = title;

      const bodyNode = document.createElement("div");
      bodyNode.className = "blurb-body";
      bodyNode.textContent = game.summary || "No description available.";

      const metaNode = document.createElement("div");
      metaNode.className = "detail-meta";
      metaNode.textContent = formatDateWithRelative(game);

      blurbEl.replaceChildren(titleNode, bodyNode, metaNode);
    }

    if (windowEl) {
      const hasSlug = Boolean(game.slug);
      windowEl.classList.toggle("clickable", hasSlug);
      windowEl.href = detailPath;
      windowEl.setAttribute("aria-label", hasSlug ? `Open ${title}` : title);
      windowEl.onclick = hasSlug
        ? (ev) => {
            if (!isPlainLeftClick(ev)) return;
            ev.preventDefault();
            onOpenDetail("game", game.slug);
          }
        : null;
    }
  }

  return { renderFeatured };
}
