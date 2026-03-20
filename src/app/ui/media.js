export function preloadImage(src, id) {
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
      if (!img.decode) {
        resolve(src);
        return;
      }

      img.decode().then(() => resolve(src)).catch(() => resolve(src));
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

export function setBackgroundImage(el, { image, preloadId, placeholder, fallbackBlendMode, loadedBlendMode }) {
  if (!el) return;

  ensureLoader(el);
  const token = Symbol("background-token");
  el._bgToken = token;

  const applyFallback = () => {
    el.style.backgroundImage = placeholder;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.backgroundBlendMode = fallbackBlendMode;
  };

  if (!image) {
    el.classList.remove("loading");
    applyFallback();
    return;
  }

  if (preloadId) preloadImage(image, preloadId);

  el.classList.add("loading");
  applyFallback();

  loadImage(image)
    .then(() => {
      if (el._bgToken !== token) return;
      el.style.backgroundImage = `url('${image}'), ${placeholder}`;
      el.style.backgroundSize = "cover, cover";
      el.style.backgroundPosition = "center, center";
      el.style.backgroundBlendMode = loadedBlendMode;
    })
    .catch(() => {
      if (el._bgToken !== token) return;
      applyFallback();
    })
    .finally(() => {
      if (el._bgToken === token) el.classList.remove("loading");
    });
}
