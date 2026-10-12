/* Interactive astronomy portfolio: pointer-reactive constellations and accessible panels. */
(() => {
  "use strict";

  const canvas = document.getElementById("sky-map");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Deterministic geometry gives each constellation a stable star pattern on resize. */
  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let clusters = [];
    let pointer = { x: -1000, y: -1000, active: false, lastMove: 0 };
    let animationFrame = 0;

    const clusterNames = [
      "CYGNUS", "LYRA", "ORION", "CASSIOPEIA", "ANDROMEDA", "PEGASUS",
      "AQUILA", "DRACO", "PERSEUS", "TAURUS", "URSA MINOR", "VIRGO",
      "LEO", "HERCULES", "CETUS", "AURIGA", "DELPHINUS", "BOOTES"
    ];
    const lineColors = [
      [158, 217, 215], [199, 184, 229], [227, 168, 181],
      [191, 205, 238], [210, 194, 160]
    ];

    function buildSky() {
      const rand = seededRandom(47512026);
      stars = Array.from({ length: Math.min(260, Math.round(width * height / 5200)) }, () => ({
        x: rand() * width,
        y: rand() * height,
        radius: .25 + rand() * 1.05,
        alpha: .12 + rand() * .46,
        phase: rand() * Math.PI * 2,
        speed: .5 + rand() * 1.2
      }));

      const count = Math.max(14, Math.min(22, Math.round(width / 76)));
      clusters = Array.from({ length: count }, (_, index) => {
        const cx = .035 + rand() * .93;
        const cy = .055 + rand() * .89;
        const radius = 42 + rand() * Math.min(70, width * .055);
        const nodeCount = 6 + Math.floor(rand() * 6);
        const nodes = Array.from({ length: nodeCount }, () => {
          const angle = rand() * Math.PI * 2;
          const distance = Math.sqrt(rand()) * radius;
          return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * (.55 + rand() * .5),
            r: .7 + rand() * 1.5,
            phase: rand() * Math.PI * 2
          };
        });
        /* A connected path with a few cross-links makes each group read as a constellation. */
        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) edges.push([i, i + 1]);
        for (let i = 0; i < nodes.length; i++) {
          let nearest = -1;
          let distance = Infinity;
          for (let j = 0; j < nodes.length; j++) {
            if (i === j || Math.abs(i - j) === 1) continue;
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const d = dx * dx + dy * dy;
            if (d < distance) { distance = d; nearest = j; }
          }
          if (nearest >= 0 && rand() > .40) {
            const edge = i < nearest ? [i, nearest] : [nearest, i];
            if (!edges.some((e) => e[0] === edge[0] && e[1] === edge[1])) edges.push(edge);
          }
        }
        return {
          x: cx * width,
          y: cy * height,
          depth: .25 + rand() * .9,
          radius,
          nodes,
          edges,
          name: clusterNames[index % clusterNames.length],
          color: lineColors[index % lineColors.length],
          phase: rand() * Math.PI * 2
        };
      });
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildSky();
      drawSky(performance.now());
    }

    function drawSky(now) {
      ctx.clearRect(0, 0, width, height);
      const age = now - pointer.lastMove;
      const pointerInfluence = pointer.active ? Math.max(0, 1 - age / 2400) : 0;

      /* Distant field of stars. */
      for (const star of stars) {
        const twinkle = reducedMotion ? 1 : .76 + .24 * Math.sin(now * .0007 * star.speed + star.phase);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(224, 235, 255, " + (star.alpha * twinkle) + ")";
        ctx.fill();
      }

      /* Reveal a network of clustered stars near the pointer; subtly parallax the whole sky. */
      for (const group of clusters) {
        const parallaxX = pointer.active ? ((pointer.x / Math.max(width, 1)) - .5) * 24 * group.depth : 0;
        const parallaxY = pointer.active ? ((pointer.y / Math.max(height, 1)) - .5) * 18 * group.depth : 0;
        const gx = group.x - parallaxX;
        const gy = group.y - parallaxY;
        const distance = Math.hypot(pointer.x - gx, pointer.y - gy);
        const reach = Math.max(150, Math.min(270, group.radius * 2.5));
        const localFocus = pointerInfluence * Math.max(0, 1 - distance / reach);
        const [red, green, blue] = group.color;
        const baseAlpha = .035 + localFocus * .56;

        for (const [a, b] of group.edges) {
          const p = group.nodes[a];
          const q = group.nodes[b];
          ctx.beginPath();
          ctx.moveTo(gx + p.x, gy + p.y);
          ctx.lineTo(gx + q.x, gy + q.y);
          ctx.strokeStyle = "rgba(" + red + ", " + green + ", " + blue + ", " + baseAlpha + ")";
          ctx.lineWidth = .55 + localFocus * .5;
          ctx.stroke();
        }

        for (const node of group.nodes) {
          const sx = gx + node.x;
          const sy = gy + node.y;
          const twinkle = reducedMotion ? 1 : .75 + .25 * Math.sin(now * .001 + node.phase);
          const bright = .16 + localFocus * .78;
          ctx.beginPath();
          ctx.arc(sx, sy, node.r + localFocus * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + Math.min(255, red + 30) + ", " + Math.min(255, green + 30) + ", " + Math.min(255, blue + 30) + ", " + (bright * twinkle) + ")";
          ctx.fill();

          if (localFocus > .34) {
            ctx.beginPath();
            ctx.arc(sx, sy, 4 + localFocus * 4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(" + red + ", " + green + ", " + blue + ", " + (.06 * localFocus) + ")";
            ctx.fill();
          }
        }

        if (localFocus > .24) {
          ctx.font = "600 8px system-ui, sans-serif";
          ctx.letterSpacing = "1.3px";
          ctx.fillStyle = "rgba(200, 202, 226, " + Math.min(.52, localFocus * .72) + ")";
          ctx.fillText(group.name, gx + group.radius * .48, gy - group.radius * .35);
        }
      }

      /* A soft glow follows the pointer while it is moving, like a searching telescope. */
      if (pointerInfluence > .01) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 170);
        glow.addColorStop(0, "rgba(158, 217, 215, " + (.075 * pointerInfluence) + ")");
        glow.addColorStop(.45, "rgba(158, 217, 215, " + (.027 * pointerInfluence) + ")");
        glow.addColorStop(1, "rgba(158, 217, 215, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.x - 170, pointer.y - 170, 340, 340);
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(drawSky);
    }

    function activatePointer(event) {
      if (event.pointerType === "touch" && event.type === "pointermove") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      pointer.lastMove = performance.now();
      if (reducedMotion) drawSky(pointer.lastMove);
    }

    window.addEventListener("pointermove", activatePointer, { passive: true });
    window.addEventListener("pointerdown", activatePointer, { passive: true });
    window.addEventListener("pointerleave", () => {
      pointer.active = false;
      if (reducedMotion) drawSky(performance.now());
    });
    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(drawSky);
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
