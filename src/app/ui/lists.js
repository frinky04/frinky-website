import { formatEntryMeta } from "../date.js";
import { routeToPath } from "../routing.js";
import { isPlainLeftClick } from "./helpers.js";

function buildList(items, type, listEl, onOpenDetail) {
  if (!listEl || !Array.isArray(items)) return;

  listEl.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    const date = document.createElement("div");
    const isDetailable = Boolean(item.slug && (type === "post" || type === "game"));
    const link = document.createElement(isDetailable ? "a" : "div");
    const meta = document.createElement("div");

    date.className = "date";
    date.textContent = item.date ? `[${item.date}]` : "";

    link.className = "link";
    link.textContent = item.title || item.text || "Untitled";

    meta.className = "meta";
    meta.textContent = formatEntryMeta(item, type);

    if (isDetailable) {
      const route = { section: "detail", type, slug: item.slug };
      li.dataset.slug = item.slug;
      li.dataset.type = type;
      link.href = routeToPath(route);
      link.addEventListener("click", (ev) => {
        if (!isPlainLeftClick(ev)) return;
        ev.preventDefault();
        onOpenDetail(type, item.slug);
      });
    }

    li.append(date, link, meta);
    listEl.appendChild(li);
  });
}

export function createListRenderer({ model, onOpenDetail }) {
  function renderLists() {
    buildList(model.posts.slice(0, model.maxPosts), "post", document.querySelector("#registry-list"), onOpenDetail);
    buildList(model.games, "game", document.querySelector("#games-list"), onOpenDetail);
    buildList(model.posts, "post", document.querySelector("#all-posts-list"), onOpenDetail);
    buildList(model.games, "game", document.querySelector("#all-games-list"), onOpenDetail);
    buildList(model.experience, "experience", document.querySelector("#experience-list"), onOpenDetail);
  }

  return { renderLists };
}
