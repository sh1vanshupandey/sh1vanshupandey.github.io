/* Interactive astronomy portfolio: pointer-reactive constellations and accessible panels. */
(() => {
  "use strict";

  /* The astronomical canvas uses the real star catalogue in assets/sky-data.js. */
  const sunSystem = document.getElementById("sun-system");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const planetSprites = Array.from(document.querySelectorAll(".planet-sprite"));
  let lastPlanetFrame = 0;

  function animatePlanets(now) {
    if (!document.hidden && !document.body.classList.contains("panel-open") && now - lastPlanetFrame > 32) {
      planetSprites.forEach((planet, index) => {
        const path = document.getElementById(planet.dataset.motionPath);
        if (!path || typeof path.getPointAtLength !== "function") return;
        const length = path.getTotalLength();
        const duration = Number(planet.dataset.travelTime || 20) * 1000;
        const fraction = ((now % duration) / duration + index * 0.23) % 1;
        const point = path.getPointAtLength(fraction * length);
        planet.setAttribute("transform", "translate(" + point.x.toFixed(2) + " " + point.y.toFixed(2) + ")");
      });
      lastPlanetFrame = now;
    }
    if (!reducedMotion.matches) window.requestAnimationFrame(animatePlanets);
  }

  function updateSunInteraction(pointerX, pointerY, active) {
    if (!sunSystem) return;
    const disc = sunSystem.querySelector(".realistic-star");
    if (!disc) return;
    const rect = disc.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const distance = Math.hypot(pointerX - cx, pointerY - cy);
    const power = active ? Math.max(0, 1 - distance / Math.max(rect.width * 1.15, 1)) : 0;
    sunSystem.style.setProperty("--solar-power", power.toFixed(3));
    sunSystem.style.setProperty("--solar-shift-x", (active ? ((pointerX / Math.max(window.innerWidth, 1)) - .5) * -8 : 0).toFixed(2) + "px");
    sunSystem.style.setProperty("--solar-shift-y", (active ? ((pointerY / Math.max(window.innerHeight, 1)) - .5) * -6 : 0).toFixed(2) + "px");
    sunSystem.classList.toggle("is-active", power > .08);
  }

  window.addEventListener("pointermove", event => updateSunInteraction(event.clientX, event.clientY, true), { passive: true });
  document.addEventListener("mouseleave", () => updateSunInteraction(-1000, -1000, false));
  if (!reducedMotion.matches) window.requestAnimationFrame(animatePlanets);
  const openers = Array.from(document.querySelectorAll("[data-panel-open]"));
  const panels = Array.from(document.querySelectorAll(".panel-layer"));
  let lastFocusedElement = null;

  function panelForHash() {
    const slug = window.location.hash.slice(1);
    const opener = openers.find((item) => item.getAttribute("href") === "#" + slug);
    return opener ? document.getElementById(opener.dataset.panelOpen) : null;
  }

  function setHash(slug) {
    const nextUrl = slug
      ? window.location.pathname + window.location.search + "#" + slug
      : window.location.pathname + window.location.search;
    window.history.replaceState(null, "", nextUrl);
  }

  function openPanel(panel, opener, updateAddress = true) {
    if (!panel) return;
    const currentlyOpen = panels.find((item) => item.classList.contains("is-visible"));
    const returnTarget = currentlyOpen
      ? openers.find((item) => item.dataset.panelOpen === currentlyOpen.id)
      : null;
    if (currentlyOpen && currentlyOpen !== panel) closePanel(false, false);

    lastFocusedElement = returnTarget || opener || document.activeElement;
    panels.forEach((item) => {
      const active = item === panel;
      item.classList.toggle("is-visible", active);
      item.setAttribute("aria-hidden", String(!active));
      item.inert = !active;
    });
    openers.forEach((item) => {
      item.setAttribute("aria-expanded", String(item.dataset.panelOpen === panel.id));
    });
    document.body.classList.add("panel-open");
    if (updateAddress) setHash(panel.id.replace("-panel", ""));
    const closeButton = panel.querySelector(".panel-close");
    if (closeButton) closeButton.focus({ preventScroll: true });
    if (panel.id === "projects-panel") observeGalleryImages();
  }

  function closePanel(restoreFocus = true, updateAddress = true) {
    const activePanel = panels.find((item) => item.classList.contains("is-visible"));
    if (!activePanel) return;
    panels.forEach((item) => {
      item.classList.remove("is-visible");
      item.setAttribute("aria-hidden", "true");
      item.inert = true;
    });
    openers.forEach((item) => item.setAttribute("aria-expanded", "false"));
    document.body.classList.remove("panel-open");
    if (updateAddress) setHash("");
    if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  openers.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      openPanel(document.getElementById(opener.dataset.panelOpen), opener);
    });
  });

  panels.forEach((panel) => {
    const closeButton = panel.querySelector(".panel-close");
    if (closeButton) closeButton.addEventListener("click", () => closePanel());
    panel.addEventListener("click", (event) => {
      if (event.target === panel) closePanel();
    });
  });

  document.addEventListener("keydown", (event) => {
    const panel = panels.find((item) => item.classList.contains("is-visible"));
    if (!panel) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(panel.querySelectorAll(
        'a[href], button:not([disabled]), summary, input, [tabindex]:not([tabindex="-1"])'
      )).filter((item) => !item.hidden && item.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("popstate", () => {
    const target = panelForHash();
    if (target) openPanel(target, null, false);
    else closePanel(false, false);
  });

  const initialPanel = panelForHash();
  if (initialPanel) openPanel(initialPanel, null, false);

  const galleryDisclosure = document.getElementById("gallery-disclosure");
  let galleryObserver = null;

  function loadGalleryImage(img) {
    if (!img || !img.dataset.src || img.src) return;
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
    img.alt = img.dataset.alt || "Portfolio gallery photograph";
    img.removeAttribute("data-alt");
  }

  function observeGalleryImages() {
    const waiting = Array.from(document.querySelectorAll(".gallery-grid img[data-src]"));
    if (!waiting.length) return;
    if ("IntersectionObserver" in window) {
      if (!galleryObserver) {
        galleryObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadGalleryImage(entry.target);
              observer.unobserve(entry.target);
            }
          });
        }, { rootMargin: "250px 0px" });
      }
      waiting.forEach((img) => galleryObserver.observe(img));
    } else {
      waiting.forEach(loadGalleryImage);
    }
  }

  if (galleryDisclosure) {
    galleryDisclosure.addEventListener("toggle", () => {
      if (galleryDisclosure.open) observeGalleryImages();
    });
  }

  const printButton = document.getElementById("print-cv");
  if (printButton) {
    printButton.addEventListener("click", () => {
      document.body.classList.add("print-cv");
      window.print();
    });
  }
  window.addEventListener("afterprint", () => document.body.classList.remove("print-cv"));
})();
