# CLAUDE.md

## Conventions

- User-facing UI text, сode comments, docs, and commit messages: **English**.
- No build step, no dependencies. Each script is a single self-contained
  `*.user.js` file with a Tampermonkey metadata header.

## newsletter-cleaner: the rule registry

All per-newsletter config lives in the `RULES` array. Each entry:

```js
{
  name:       'FAUN.dev',                 // human label, for readability only
  match:      (loc) => boolean,           // does this rule apply to the page?
  keepTitles: ['stories', 'tools'],       // section titles to KEEP (lowercased substring match)
  sectionSel: '.section',                 // selector for one section block
  titleSel:   '.section-title',           // selector for the title inside a block
  hideSel:    ['.alert.sticky', ...],     // extra chrome to hide (banners, footer, logo, ...)
}
```

Runtime logic (don't change it when adding a source — only add a `RULES` entry):

1. Pick the first rule whose `match(location)` is true; if none, do nothing.
2. For each `sectionSel` block: keep it if its `titleSel` text (lowercased)
   contains any `keepTitles` substring, otherwise hide it.
3. **Safety:** if zero sections matched the whitelist, leave the page untouched.
   A noisy page beats a blank one (this is also what happens if a source changes
   its markup — the rule silently stops matching).
4. Hide everything in `hideSel`.
5. Add a floating toggle badge that restores all hidden elements.

## Adding a new newsletter source

The reliable way is to inspect the live DOM, not guess. With the Claude-in-Chrome
tools available:

1. **Load the newsletter** in an MCP tab and get an overview: list `h1`–`h3`
   headings and the top-level layout to find the repeating section container and
   its title element.
2. **Find the section pattern.** Most newsletters render a regular structure
   (e.g. `div.section > h2.section-title` + repeated `div.link-item`). Confirm the
   selectors and that article links live inside the kept sections.
3. **Decide keep vs. noise** with the user: which section titles are articles
   (`keepTitles`) and which top-level chrome (banner, masthead/logo, service
   links, footer) goes into `hideSel`. Chrome usually sits *outside* the section
   blocks, so it needs explicit `hideSel` selectors.
4. **Verify it generalizes** across a few issues: `fetch()` 2–3 other issue URLs
   (same-origin), parse with `DOMParser`, and check the same sections/selectors
   exist. Issue-to-issue variation (a missing section, different count) is fine —
   the whitelist handles it.
5. **Prototype live** by injecting the hide logic into the page and screenshotting
   the result; iterate with the user until it's clean.
6. **Write the rule:** add the `RULES` entry and extend `@match` in the metadata
   header to cover the source's URLs.

### Gotchas learned from FAUN.dev

- **Content is server-rendered** there, so `@run-at document-end` is enough — no
  need to wait for client-side JS or use a `MutationObserver`. Verify this per
  source (check the raw `fetch()`ed HTML already contains the sections).
- External links are wrapped in a tracking redirector (`from.faun.to`). The links
  still work, so the script leaves them untouched. (Side effect during
  development: the Chrome tool's output filter blocks results containing those
  tracking URLs — extract structured fields / booleans instead of dumping raw
  HTML or hrefs.)
- Match section titles by lowercased **substring** (e.g. `'stories'`), not exact
  text, so emoji and punctuation in the title don't break the rule.
