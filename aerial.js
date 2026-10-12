/* Interactive panels and a lightweight animated star field */
(() => {
  "use strict";

  const canvas = document.getElementById("sky-map");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canvas) {
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let stars = [];
    const starCount = 190;

    function resizeCanvas() {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.25 + .15,
        phase: Math.random() * Math.PI * 2,
        speed: .25 + Math.random() * .8,
        alpha: .2 + Math.random() * .58
      }));
      drawStars(0);
    }

    function drawStars(time) {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reducedMotion ? 1 : .68 + .32 * Math.sin(time * .00045 * star.speed + star.phase);
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(231, 239, 255, " + (star.alpha * twinkle) + ")";
        context.fill();
        if (star.radius > 1.05) {
          context.beginPath();
          context.moveTo(star.x - 3, star.y);
          context.lineTo(star.x + 3, star.y);
          context.moveTo(star.x, star.y - 3);
          context.lineTo(star.x, star.y + 3);
          context.strokeStyle = "rgba(158, 217, 215, " + (.12 * twinkle) + ")";
          context.lineWidth = .5;
          context.stroke();
        }
      }
      if (!reducedMotion) window.requestAnimationFrame(drawStars);
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();
  }

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
    if (currentlyOpen && currentlyOpen !== panel) closePanel(false, false);

    lastFocusedElement = opener || document.activeElement;
    panels.forEach((item) => {
      const isTarget = item === panel;
      item.classList.toggle("is-visible", isTarget);
      item.setAttribute("aria-hidden", String(!isTarget));
      item.inert = !isTarget;
    });
    openers.forEach((item) => {
      const isTarget = item.dataset.panelOpen === panel.id;
      item.setAttribute("aria-expanded", String(isTarget));
    });
    document.body.classList.add("panel-open");
    if (updateAddress) setHash(panel.id.replace("-panel", ""));
    const closeButton = panel.querySelector(".panel-close");
    if (closeButton) closeButton.focus({ preventScroll: true });

    if (panel.id === "projects-panel") observeGalleryImages();
  }

  function closePanel(restoreFocus = true, updateAddress = true) {
    const currentlyOpen = panels.find((item) => item.classList.contains("is-visible"));
    if (!currentlyOpen) return;
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
      )).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
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
    const matchingPanel = panelForHash();
    if (matchingPanel) openPanel(matchingPanel, null, false);
    else closePanel(false, false);
  });

  const initialPanel = panelForHash();
  if (initialPanel) openPanel(initialPanel, null, false);

  /* Gallery photographs are only requested when the disclosure is opened. */
  const galleryDisclosure = document.getElementById("gallery-disclosure");
  let galleryObserver = null;

  function loadGalleryImage(image) {
    if (!image || !image.dataset.src || image.src) return;
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
    image.alt = image.dataset.alt || "Portfolio gallery photograph";
    image.removeAttribute("data-alt");
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
      waiting.forEach((image) => galleryObserver.observe(image));
    } else {
      waiting.forEach(loadGalleryImage);
    }
  }

  if (galleryDisclosure) {
    galleryDisclosure.addEventListener("toggle", () => {
      if (galleryDisclosure.open) observeGalleryImages();
    });
  }

  /* Use the browser print dialog to let visitors save the CV panel as a PDF. */
  const printButton = document.getElementById("print-cv");
  if (printButton) {
    printButton.addEventListener("click", () => {
      document.body.classList.add("print-cv");
      window.print();
    });
  }
  window.addEventListener("afterprint", () => document.body.classList.remove("print-cv"));
})();
