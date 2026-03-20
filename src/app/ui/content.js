import { formatBirthDateLabel } from "../date.js";
import { withExternalLinkAttrs } from "./helpers.js";

export function renderHomeIntro(model) {
  const homeIntroEl = document.querySelector("#home-intro-content");
  if (!homeIntroEl) return;

  homeIntroEl.innerHTML = withExternalLinkAttrs(model.home?.contentHtml || "");
}

export function renderAbout(model) {
  const about = model.about || {};
  const aboutWindow = document.querySelector(".about-window");
  const aboutImage = document.querySelector("#about-image");
  const aboutNameEl = document.querySelector("#about-name");
  const aboutContentEl = document.querySelector("#about-content");
  const aboutAgeEl = document.querySelector("#about-age");

  if (aboutWindow && about.imageAlt) {
    aboutWindow.setAttribute("aria-label", about.imageAlt);
  }

  if (aboutImage) {
    aboutImage.src = about.image || "/images/frog.png";
    aboutImage.alt = about.imageAlt || "";
  }

  if (aboutNameEl) aboutNameEl.textContent = about.name || "";
  if (aboutContentEl) aboutContentEl.innerHTML = withExternalLinkAttrs(about.contentHtml || "");
  if (aboutAgeEl) aboutAgeEl.textContent = formatBirthDateLabel(about.birthDate);
}

export function setupContactActions() {
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
