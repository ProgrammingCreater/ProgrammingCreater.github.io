// ----------------------------------------------------------------------------
// app.js — renders the grid view and detail view, handles search/filter
// state, hash-based routing (#/project/<slug>), and the optional manual
// image-rotation fix (equivalent to the old Python ImageOps logic).
// ----------------------------------------------------------------------------

const state = {
  search: "",
  tags: new Set(),
  statuses: new Set(),
};

const mainEl = document.getElementById("main");

function slugify(title) {
  return encodeURIComponent(title.trim().toLowerCase().replace(/\s+/g, "-"));
}

function findProjectBySlug(slug) {
  return PROJECTS.find((p) => slugify(p.title) === slug);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ----------------------------------------------------------------------------
   Image loading with optional manual rotation.
   Most modern browsers already auto-rotate JPEGs per their EXIF Orientation
   tag, but that tag is sometimes missing or wrong (e.g. after a photo was
   re-saved by another app). For those cases an entry can carry an explicit
   { path, rotate } override, applied here via a canvas — mirroring the
   PIL.Image.rotate(expand=True) behavior from the original app.
---------------------------------------------------------------------------- */
const rotatedImageCache = new Map();

function resolveImageEntry(entry) {
  if (typeof entry === "string") return { path: entry, rotate: 0 };
  return { path: entry.path || "", rotate: entry.rotate || 0 };
}

function loadImageSrc(entry) {
  const { path, rotate } = resolveImageEntry(entry);
  if (!path || !rotate || /^https?:\/\//i.test(path)) {
    return Promise.resolve(path);
  }
  if (rotatedImageCache.has(path + ":" + rotate)) {
    return Promise.resolve(rotatedImageCache.get(path + ":" + rotate));
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const rad = ((((rotate % 360) + 360) % 360) * Math.PI) / 180;
      const swap = rotate % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.naturalHeight : img.naturalWidth;
      canvas.height = swap ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const dataUrl = canvas.toDataURL("image/png");
      rotatedImageCache.set(path + ":" + rotate, dataUrl);
      resolve(dataUrl);
    };
    img.onerror = () => resolve(path); // let the <img> show its own broken-image state
    img.src = path;
  });
}

/** Sets an <img>'s src, applying rotation once the source is resolved. */
function bindImage(imgEl, entry) {
  const { path } = resolveImageEntry(entry);
  imgEl.alt = imgEl.alt || "";
  loadImageSrc(entry).then((src) => {
    imgEl.src = src || path;
  });
}

/* ----------------------------------------------------------------------------
   Filtering — mirrors the Python matches_filters()
---------------------------------------------------------------------------- */
function matchesFilters(project) {
  const haystack = (project.title + project.summary).toLowerCase();
  if (state.search && !haystack.includes(state.search.toLowerCase())) return false;
  if (state.tags.size && !project.tags.some((t) => state.tags.has(t))) return false;
  if (state.statuses.size && !state.statuses.has(project.status)) return false;
  return true;
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

/* ----------------------------------------------------------------------------
   Sidebar filter chips
---------------------------------------------------------------------------- */
function renderChipGroup(container, values, activeSet, onToggle) {
  container.innerHTML = "";
  values.forEach((value) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (activeSet.has(value) ? " active" : "");
    chip.textContent = value;
    chip.setAttribute("aria-pressed", activeSet.has(value) ? "true" : "false");
    chip.addEventListener("click", () => {
      if (activeSet.has(value)) activeSet.delete(value);
      else activeSet.add(value);
      onToggle();
    });
    container.appendChild(chip);
  });
}

function setupSidebar() {
  const allTags = [...new Set(PROJECTS.flatMap((p) => p.tags))].sort();
  const allStatuses = [...new Set(PROJECTS.map((p) => p.status))].sort();

  const tagContainer = document.getElementById("tagFilters");
  const statusContainer = document.getElementById("statusFilters");

  const refreshChips = () => {
    renderChipGroup(tagContainer, allTags, state.tags, () => {
      refreshChips();
      renderGrid();
    });
    renderChipGroup(statusContainer, allStatuses, state.statuses, () => {
      refreshChips();
      renderGrid();
    });
  };
  refreshChips();

  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    renderGrid();
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    state.search = "";
    state.tags.clear();
    state.statuses.clear();
    searchInput.value = "";
    refreshChips();
    renderGrid();
  });

  // mobile drawer
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebarToggle");
  const scrim = document.getElementById("scrim");
  const closeDrawer = () => {
    sidebar.classList.remove("open");
    scrim.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    scrim.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  scrim.addEventListener("click", closeDrawer);
}

/* ----------------------------------------------------------------------------
   Grid view
---------------------------------------------------------------------------- */
function renderGrid() {
  // Only re-render the grid if we're currently on the grid route.
  if (location.hash.startsWith("#/project/")) return;

  const filtered = PROJECTS.filter(matchesFilters);

  const header = `
    <div class="page-header">
      <h2>My Projects</h2>
      <p>A collection of engineering things I've built. Use the panel to search or filter.</p>
    </div>
    <div class="header-rule"></div>
  `;

  let body;
  if (!filtered.length) {
    body = `<div class="empty-state">No projects match your filters. Try adjusting them in the panel.</div>`;
  } else {
    body = `<div class="project-grid">${filtered.map(cardHtml).join("")}</div>
      <div class="results-caption">Showing ${filtered.length} of ${PROJECTS.length} projects.</div>`;
  }

  mainEl.innerHTML = header + body;

  filtered.forEach((project) => {
    const thumb = project.images && project.images[0];
    if (!thumb) return;
    const imgEl = mainEl.querySelector(`img[data-slug="${slugify(project.title)}"]`);
    if (imgEl) bindImage(imgEl, thumb);
  });
}

function cardHtml(project) {
  const slug = slugify(project.title);
  const thumb = project.images && project.images[0];
  const thumbHtml = thumb
    ? `<img data-slug="${slug}" alt="${escapeHtml(project.title)} thumbnail">`
    : `<div class="card-thumb-empty">No image</div>`;

  const extras = [];
  if (project.images && project.images.length > 1) extras.push(`${project.images.length} photos`);
  if (project.video_url) extras.push("video demo");
  if (project.errors_encountered && project.errors_encountered.length)
    extras.push(`${project.errors_encountered.length} issues logged`);

  return `
    <article class="project-card">
      <div class="card-thumb-wrap">${thumbHtml}</div>
      <div class="title-block">
        <h3>${escapeHtml(project.title)}</h3>
        <span class="status-badge status-${statusClass(project.status)}">${escapeHtml(project.status)}</span>
      </div>
      <p class="project-summary">${escapeHtml(project.summary)}</p>
      <div class="tag-row">${project.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      ${extras.length ? `<div class="card-meta">${extras.join(" · ")}</div>` : ""}
      <div class="card-footer">
        <a class="view-btn" href="#/project/${slug}">View Details</a>
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------------------------
   Detail view
---------------------------------------------------------------------------- */
function renderDetail(project) {
  const links = [];
  if (project.repo_url) links.push(`<a class="link-btn" href="${escapeHtml(project.repo_url)}" target="_blank" rel="noopener">View Code</a>`);
  if (project.demo_url) links.push(`<a class="link-btn" href="${escapeHtml(project.demo_url)}" target="_blank" rel="noopener">Live Demo</a>`);

  const gallerySection =
    project.images && project.images.length
      ? `<div class="detail-section">
          <h4>Gallery</h4>
          <div class="gallery-row" id="galleryRow"></div>
        </div>`
      : "";

  const videoSection = project.video_url
    ? `<div class="detail-section">
        <h4>Video Demo</h4>
        <div class="video-wrap">${videoEmbedHtml(project.video_url)}</div>
      </div>`
    : "";

  const issuesSection =
    project.errors_encountered && project.errors_encountered.length
      ? `<div class="detail-section">
          <h4>Errors Encountered</h4>
          <div class="issue-list">
            ${project.errors_encountered
              .map(
                (err, i) => `
              <details class="issue-item">
                <summary><span class="issue-num">${String(i + 1).padStart(2, "0")}</span> ${escapeHtml(err.issue)} <span class="issue-caret">›</span></summary>
                <div class="issue-body"><strong>Solution:</strong> ${escapeHtml(err.solution)}</div>
              </details>`
              )
              .join("")}
          </div>
        </div>`
      : "";

  mainEl.innerHTML = `
    <a class="back-link" href="#/">← All projects</a>
    <div class="title-block-hero">
      <div class="hero-top-row">
        <h1 class="detail-title">${escapeHtml(project.title)}</h1>
        <span class="status-badge status-${statusClass(project.status)}">${escapeHtml(project.status)}</span>
      </div>
      <div class="tag-row hero-tags">${project.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      ${links.length ? `<div class="hero-links">${links.join("")}</div>` : ""}
    </div>
    ${gallerySection}
    ${videoSection}
    <div class="detail-section">
      <h4>Description</h4>
      <p class="project-description">${escapeHtml(project.full_description)}</p>
    </div>
    ${issuesSection}
  `;

  if (project.images && project.images.length) {
    const row = document.getElementById("galleryRow");
    project.images.forEach((entry, i) => {
      const img = document.createElement("img");
      img.alt = `${project.title} photo ${i + 1}`;
      bindImage(img, entry);
      row.appendChild(img);
    });
  }

  mainEl.focus();
  window.scrollTo(0, 0);
}

function videoEmbedHtml(url) {
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (youtubeMatch) {
    return `<iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" title="Video demo" allowfullscreen></iframe>`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" title="Video demo" allowfullscreen></iframe>`;
  }
  return `<video src="${escapeHtml(url)}" controls></video>`;
}

/* ----------------------------------------------------------------------------
   Routing
---------------------------------------------------------------------------- */
function route() {
  const hash = location.hash;
  const match = hash.match(/^#\/project\/(.+)$/);
  if (match) {
    const project = findProjectBySlug(decodeURIComponent(match[1]));
    if (project) {
      renderDetail(project);
      return;
    }
  }
  renderGrid();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  route();
});
