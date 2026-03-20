import { isPlainLeftClick } from "./helpers.js";

export function showSection(section) {
  if (!section) return;

  document.querySelectorAll(".page-section").forEach((sec) => {
    const id = sec.id.replace("section-", "");
    sec.classList.toggle("hidden", id !== section);
  });

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === section);
  });
}

export function setupNav(onNavigateSection) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (ev) => {
      if (!isPlainLeftClick(ev)) return;
      ev.preventDefault();
      const target = link.dataset.nav;
      if (target) onNavigateSection(target);
    });
  });

  const postsAll = document.querySelector("[data-action='view-all-posts']");
  if (postsAll) {
    postsAll.addEventListener("click", (ev) => {
      if (!isPlainLeftClick(ev)) return;
      ev.preventDefault();
      onNavigateSection("posts-all");
    });
  }

  const gamesAll = document.querySelector("[data-action='view-all-games']");
  if (gamesAll) {
    gamesAll.addEventListener("click", (ev) => {
      if (!isPlainLeftClick(ev)) return;
      ev.preventDefault();
      onNavigateSection("games-all");
    });
  }

  document.querySelectorAll("[data-action='back-home']").forEach((backHome) => {
    backHome.addEventListener("click", (ev) => {
      if (!isPlainLeftClick(ev)) return;
      ev.preventDefault();
      onNavigateSection("home");
    });
  });
}
