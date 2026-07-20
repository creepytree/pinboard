# <App> — agent reference

<!--
Template for a consumer app of the druids design framework. Copy this file to the
consumer app's repo root as AGENTS.md, replace <App>/<app>, and fill the Layout
section with the app's own files. The Startup + "Do always" sections are generic —
keep them as-is so every consumer app follows the same rules.
-->

<App> is a **consumer of the `druids` design framework** (pip name `druidforms`,
import name `druids`). It is pure Python: FastAPI + Jinja. It ships **no JS build
step** — all design, theming, the app shell, login/session and every `<druid-*>`
element come from the installed `druids` package.

## Startup

**On the first turn, before writing any UI, install the framework and study it:**

1. **Create a venv** and activate it: `python -m venv .venv && . .venv/bin/activate`.
2. **Install the framework** into it from its git URL:
   `pip install "druidforms @ git+<framework-repo-url>"`. Get `<framework-repo-url>` from,
   in order: this app's `requirements.txt` / `pyproject.toml` if it already pins
   `druidforms`; otherwise the framework repo you were pointed at when asked to build this
   app. In local dev, `pip install -e <path>` to a sibling checkout instead. Then add the
   same pin to the app's `requirements.txt`.
3. **Find it in site-packages:** `python -c "import druids, os; print(os.path.dirname(druids.__file__))"`.
4. **Study the framework** there: read `<site-packages>/druids/AGENTS.md` — the API
   contract (every `<druid-*>` component, `df-*` class, design token and the
   `window.druids` JS API). Build UI only from what it documents.

## Do always

> **Build on the framework, never reinvent it.** Before adding markup, CSS or JS, check
> whether druids already provides it: a `<druid-*>` component, a `df-*` class, a design
> token (`--accent`, `--border`, `--bg-raised`, `--radius`, …) or `druids.toast()` /
> `druids.applyAccent()`. App CSS must theme with those tokens, not hardcoded colors,
> and must not re-implement a component the framework already ships.
>
> **Keep this app matching the framework's current API.** The catalog above is the
> source of truth. If a druids component, attribute, event or class was renamed or
> removed upstream, update this app's templates/CSS/JS to match in the same change.
>
> **Missing or wrong in the design system → fix it upstream, not here.** If a UI need
> isn't met, add or change the component in the `druids` framework repo (rebuild its
> bundle there) rather than growing a local one-off. Only genuinely app-specific UI
> lives in this app.

## Layout

<!-- Fill this in per app. Point at the Druids(...) instance, the routes/templates,
     and where app-specific (non-framework) CSS/JS lives. Example: -->

- `<app>/shell.py` — the single `Druids(...)` instance (brand, version, login,
  `templates_dir`); `<app>/app.py` calls `druids.install(app)`.
- `<app>/routes.py` — pages render via `druids.templates`.
- `<app>/templates/*.jinja2` — extend `druids/base.jinja2`; fill the `styles`, `tabs`,
  `actions`, `content`, `scripts` blocks with `<druid-*>` tags.
- `<app>/static/{css,js}/` — only app-specific UI. Framework CSS is prefixed `df-`;
  keep app class names distinct and token-driven.
