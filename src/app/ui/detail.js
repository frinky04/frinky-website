import { withExternalLinkAttrs } from "./helpers.js";
import { setBackgroundImage } from "./media.js";

export function createDetailRenderer() {
  function renderDetail(entry, type) {
    const detailSection = document.getElementById("section-detail");
    const titleEl = detailSection?.querySelector(".detail-title");
    const metaEl = detailSection?.querySelector(".detail-meta");
    const bodyEl = detailSection?.querySelector("#detail-body");

    if (titleEl) titleEl.textContent = entry.title || "Untitled";
    if (metaEl) metaEl.textContent = entry.date || entry.meta || "";

    if (bodyEl) {
      bodyEl.innerHTML = withExternalLinkAttrs(entry.contentHtml) || "<p>More details coming soon.</p>";

      if (type === "game" && entry.downloadUrl) {
        const downloadLink = document.createElement("a");
        downloadLink.className = "download-btn";
        downloadLink.href = entry.downloadUrl;
        downloadLink.target = "_blank";
        downloadLink.rel = "noopener noreferrer";
        downloadLink.textContent = "Download / Play";
        bodyEl.appendChild(downloadLink);
      }
    }

    setBackgroundImage(document.querySelector("#section-detail .detail-hero"), {
      image: entry.image,
      preloadId: "preload-detail-image",
      placeholder: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.6))",
      fallbackBlendMode: "overlay",
      loadedBlendMode: "overlay, normal",
    });
  }

  return { renderDetail };
}
