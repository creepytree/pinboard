# Pinboard — agent reference

Pinboard is a **consumer of the `druids` design framework** (pip name `druidforms`,
import name `druids`). It is pure Python: FastAPI + Jinja. It ships **no JS build
step** — all design, theming, the app shell, login/session and every `<druid-*>`
element come from the installed `druids` package.

## On resuming edits

1. **Create a venv** and activate it: `python -m venv .venv && . .venv/bin/activate`.
2. **Update the framework** into it from its git URL:
   `pip install "druidforms @ git+https://github.com/creepytree/druidforms"`
   (in local dev, `pip install -e ../druidforms` against the sibling checkout).
3. **Study the CHANGELOG.md** Compare local version with latest pull and check if the project needs patches on the new version or would gain quality, simplification or a reduction in line-count by patching.
4. **Read GAPS_FIX.md** if you came from a previous run and reported gaps.
5. **Add bugs, gaps, wanted patches to GAPS.md** This gets consumed by the Agent processing the framework. Overwrite with fresh content on a new edit roundtrip if the file notes a resolved state.
6. **Remove resolved GAPS_FIX.md** if you are done.

## Startup new project

**On the first turn, before writing any UI, install the framework and study it:**

1. **Create a venv** and activate it: `python -m venv .venv && . .venv/bin/activate`.
2. **Install the framework** into the venv `pip install "druidforms @ git+<framework-repo-url>"`
3. **Study the framework** in the venv:
   - `<site-packages>/druids/AGENTS.md` — orientation: how to wire the app, page
     templates, `df-*` classes, and the light-DOM composition patterns.
   - `<site-packages>/druids/static/druids.components.json` — the **exact contract**
     for every `<druid-*>` and `window.druids` API: attributes, events (with `detail`
     shape), slots, methods, consumed CSS vars, gotchas, example. Read this instead of
     grepping the bundle. `druids.registry.json` = what tags/APIs exist + since which
     version; `druids.tokens.json` = theme tokens with roles + defaults.
   Build UI only from what these document.
4. Write AGENTS.consumer.md in the workspace root of the consumer
5. Write README.consumer.md for the consumer, @placeholder@ define allowed changes, keep it strict on this

## Do always

> **Build on the framework, never reinvent it.** Before adding markup, CSS or JS, check
> whether druids already provides it: a `<druid-*>` component, a `df-*` class, a design
> token (`--accent`, `--border`, `--bg-raised`, `--radius`, …) or `druids.toast()` /
> `druids.applyAccent()`. App CSS must theme with those tokens, not hardcoded colors,
> and must not re-implement a component the framework already ships.
>
> **Keep this app matching the framework's current API.** The shipped contract manifest
> (`druids/static/druids.components.json` + `.registry.json`) is the source of truth. If a
> druids component, attribute, event or class was renamed or removed upstream, update this
> app's templates/CSS/JS to match in the same change.
>
> **Missing or wrong in the design system → fix it upstream, not here.** If a UI need
> isn't met, add or change the component in the `druids` framework repo (rebuild its
> bundle there) rather than growing a local one-off. Only genuinely app-specific UI
> lives in this app.

## Layout

- `pinboard/shell.py` — the single `Druids(...)` instance (brand `Pinboard`, slug,
  version/author/github from `config.py`, `base_path`, optional `LoginSettings`,
  `templates_dir`). `pinboard/app.py` calls `druids.install(app)`, then adds
  `BasePathMiddleware` *after* it so the prefix is stripped before the session check.
- `pinboard/routes.py` — the one page, rendered via `druids.templates`. No context
  dict: `druids`, `base_path` and the footer metadata are template globals.
- `pinboard/api.py` — the JSON API (entries, notes, import/export, image fetch,
  `/api/log`, whose shape already matches what `<druid-log-view>` expects).
- `pinboard/db.py` / `log.py` / `env.py` / `config.py` — sqlite storage, rotating
  file log, env parsing, packaging metadata. None of these touch the framework.
- `pinboard/templates/main.jinja2` — the only template; extends
  `druids/base.jinja2` and fills `styles`, `tabs`, `actions`, `content`, `scripts`.
  The login page comes from the framework.
- `pinboard/static/css/` — app-specific UI only, all token-driven:
  - `pinboard.css` — edit-mode visibility helper, plus the `[hidden]` workaround
    documented in `GAPS.md`.
  - `entries.css` — the round entry tiles (grid, disc button, ripple, drag state).
    This is pinboard's signature UI and has no framework equivalent; keep it.
  - `notes.css` — the key/value notes list under the grid. Deliberately *not* a
    `.df-table`: it is a borderless two-column list with click-to-copy cells.
- `pinboard/static/js/` — classic scripts (no modules, no build):
  `util.js` (api fetch, `ICONS` + `druids.registerIcons`, `editMode`),
  `entries.js`, `notes.js`, `config.js` (import/export), `app.js` (loaded last).

### What comes from the framework, not from here

Navbar, footer, accent picker and favicon, login page + session middleware, tabs
(`<druid-tabs>`), the log tab (`<druid-log-view>`), dialogs (`.df-dialog`,
`druids.confirm()`), toasts (`druids.toast()`), popovers (`<druid-popover>`),
buttons (`<druid-button>`, `<druid-icon-button>`), the textarea
(`<druid-textarea>`), form field classes (`.df-field` / `.df-label`) and the
empty state (`.df-empty`). Do not re-add local versions of any of these.
