import { renderAbout, renderHomeIntro, setupContactActions } from "./ui/content.js";
import { createDetailRenderer } from "./ui/detail.js";
import { createFeatureRenderer } from "./ui/feature.js";
import { createListRenderer } from "./ui/lists.js";
import { setupNav, showSection } from "./ui/nav.js";

export function createUI({ model, onOpenDetail, onNavigateSection }) {
  const { renderLists } = createListRenderer({ model, onOpenDetail });
  const { renderFeatured } = createFeatureRenderer({ model, onOpenDetail });
  const { renderDetail } = createDetailRenderer();

  function init() {
    renderHomeIntro(model);
    renderAbout(model);
    renderFeatured(model.featured);
    renderLists();
    setupContactActions();
    setupNav(onNavigateSection);
  }

  return {
    init,
    showSection,
    renderDetail,
  };
}
