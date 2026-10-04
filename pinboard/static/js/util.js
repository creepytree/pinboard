/* pinboard - shared helpers: api fetch, icon registration, global state */

const BASE_PATH = document.body.dataset.basePath || "";

const api = (path, options = {}) =>
    fetch(`${BASE_PATH}/api${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    }).then(async (response) => {
        if (response.status === 401) {
            window.location.href = `${BASE_PATH}/login`;
            throw new Error("unauthenticated");
        }
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || `HTTP ${response.status}`);
        }
        return response.json();
    });

let editMode = false;

/* ---------- icons (lucide.dev, MIT) ----------
   The framework ships no icons: pinboard registers the handful it uses, then
   references them by name via <druid-icon name> / <druid-icon-button icon>. */

const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
    pencil: svg(
        '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'
    ),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    eye: svg(
        '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'
    ),
    plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    export: svg(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>' +
            '<line x1="12" x2="12" y1="3" y2="15"/>'
    ),
    import: svg(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>' +
            '<line x1="12" x2="12" y1="15" y2="3"/>'
    ),
};

// druids.js is a module: it runs after this classic script but before
// DOMContentLoaded. The registry notifies elements that already rendered.
window.addEventListener("DOMContentLoaded", () => druids.registerIcons(ICONS));
