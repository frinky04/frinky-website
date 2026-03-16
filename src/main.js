import "./styles/main.css";
import { CONTENT } from "./generated/content.generated.js";
import { createModel } from "./app/model.js";
import { createUI } from "./app/ui.js";
import { normalizeRoute, parseLocationRoute, routeToPath } from "./app/routing.js";
import { updateSeo } from "./app/seo.js";

const model = createModel(CONTENT);

const ui = createUI({
  model,
  onOpenDetail: (type, slug) => navigate({ section: "detail", type, slug }, "push"),
  onNavigateSection: (section) => navigate({ section }, "push"),
});

function updateHistory(route, mode = "none") {
  if (mode === "none") return;
  const method = mode === "replace" ? "replaceState" : "pushState";
  history[method](route, "", routeToPath(route));
}

function navigate(route, mode = "none") {
  const normalized = normalizeRoute(route);

  if (normalized.section === "detail") {
    const entry = model.findEntry(normalized.type, normalized.slug);

    if (!entry) {
      const fallback = { section: "home" };
      updateHistory(fallback, mode === "none" ? "none" : "replace");
      ui.showSection("home");
      updateSeo({ route: fallback, site: model.site });
      return;
    }

    ui.renderDetail(entry, normalized.type);
    ui.showSection("detail");
    updateHistory(normalized, mode);
    updateSeo({ route: normalized, entry, site: model.site });
    return;
  }

  ui.showSection(normalized.section);
  updateHistory(normalized, mode);
  updateSeo({ route: normalized, site: model.site });
}

window.addEventListener("popstate", () => {
  navigate(parseLocationRoute(window.location), "none");
});

document.addEventListener("DOMContentLoaded", () => {
  ui.init();
  navigate(parseLocationRoute(window.location), "replace");
});
